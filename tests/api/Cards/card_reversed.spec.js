require('dotenv').config();
const { sendEvent } = require('../../../utils/kafkaHelper');
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getRandomValue, getIsoDate } = require('../../../utils/utilsHelper');
const data = require('../../data/cards_data');

describe('Authorization reversed', () => { //test8
    
    data.forEach(({ username, password, amount, merchantCountry, merchantCurrency, merchantAmount, provider, operationId }) => {

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        let customerId, userId, cardId, preauthId, fxRate, token, country, preferredCurrency;
        let externalReference = getRandomValue(5);
        
        test('Authenticate with a user token', async () => {
            const requestBody = {
                "username": username,
                "password": password,
            };

            response = await post(`/v1/sts/authentication`, requestBody);
            expect(typeof response.body.token).toBe('string');

            token = response.body.token;
        });

        test('Get introspect values', async () => {
            response = await get(`/v1/sts/introspect`, token);

            country = response.body.customerCountry;
            preferredCurrency = response.body.customerDefaultCurrency;
            customerId = response.body.customerId;
            userId = response.body.userId;
        });

        test('Get card Id', async () => {

            const sqlQuery = 'SELECT * FROM user_card_balance WHERE customer_id = $1 and user_id = $2 and period_month = $3 and period_year = $4 limit 1';
            const queryParams = [customerId, userId, currentMonth, currentYear];

            const result = await query('ledger', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].customer_id).toBe(customerId);

            cardId = result[0].card_id;

        });

        test('Set customer expenditure to 0', async () => {
            const sqlQuery = 'UPDATE customer_balance SET expenditure = 0, pref_currency_expenditure = 0 WHERE customer_id = $1 and period_month = $2 and period_year = $3';
            const queryParams = [ customerId, currentMonth, currentYear ];
            await query('ledger', sqlQuery, queryParams);
            
            const sqlQuery2 = 'SELECT * FROM customer_balance WHERE customer_id = $1 and period_month = $2 and period_year = $3';
            const queryParams2 = [ customerId, currentMonth, currentYear ];
            const result1 = await query('ledger', sqlQuery2, queryParams2);
            
            expect(result1[0].expenditure).toBe("0");
            expect(result1[0].pref_currency_expenditure).toBe("0");
        });

        test('Set user expenditure to 0', async () => {
            const sqlQuery = 'UPDATE user_balance SET expenditure = 0, pref_currency_expenditure = 0 WHERE user_id = $1 and period_month = $2 and period_year = $3';
            const queryParams = [ userId, currentMonth, currentYear ];
            await query('ledger', sqlQuery, queryParams);
            
            const sqlQuery2 = 'SELECT * FROM user_balance WHERE customer_id = $1 AND user_id = $2 and period_month = $3 and period_year = $4';
            const queryParams2 = [ customerId, userId, currentMonth, currentYear ];
            const result2 = await query('ledger', sqlQuery2, queryParams2);
            
            expect(result2[0].expenditure).toBe("0");
            expect(result2[0].pref_currency_expenditure).toBe("0");
            
        });

        test('Set card expenditure to 0', async () => {
            const sqlQuery = 'UPDATE user_card_balance SET expenditure = 0, pref_currency_expenditure = 0 WHERE card_id = $1 and period_month = $2 and period_year = $3';
            const queryParams = [ cardId, currentMonth, currentYear ];
            await query('ledger', sqlQuery, queryParams);
            
            const sqlQuery2 = 'SELECT * FROM user_card_balance WHERE customer_id = $1 AND user_id = $2 AND card_id = $3 and period_month = $4 and period_year = $5';
            const queryParams2 = [ customerId, userId, cardId, currentMonth, currentYear ];
            const result3 = await query('ledger', sqlQuery2, queryParams2);
        
            expect(result3[0].expenditure).toBe("0");
            expect(result3[0].pref_currency_expenditure).toBe("0");
        });

        test('Preauthorize card transaction', async () => {

            const requestBody = {
                "product":"CARD",
                "userId": userId,
                "customerId": customerId,
                "userName": "John Doe",
                "cardId": cardId,
                "cardNumber": "3986",
                "amount": amount,
                "currency": preferredCurrency,
                "preferredCurrency": preferredCurrency,
                "merchant": "uber",
                "merchantCountry": merchantCountry,
                "merchantCurrency": merchantCurrency,
                "merchantAmount": merchantAmount,
                "externalReference": externalReference,
                "fxRate": 0.058368734,
                "provider": provider,
                "metadata":{
                    "provider":"",
                    "referenceID":"C1635"
                }
            };

            response = await post(`/v2/pre-authorize`, requestBody, token);
            expect(response.body.status).toBe('Approved');
            
            preauthId = response.body.preAuthID;
        });


        test('Send card "Captured" event', async () => {

            const topic = 'cards.fact.notices';
            const event = 'tribal.cards.authorization_approved';
            
            const payload = {
                "amount":amount,
                "authorizationId":"",
                "cardId":cardId,
                "cardNickName":"my card",
                "cardholder":"",
                "country":country,
                "currency":preferredCurrency,
                "customerId":customerId,
                "issuerId":"43867793-43c5-48f4-b32d-7bef1379bc35",
                "lastFourDigits":"6386",
                "ledgerAuthId": preauthId,
                "merchantAmount":merchantAmount,
                "merchantCurrency":merchantCurrency,
                "merchantInfo":{
                   "categoryCode":"3076",
                   "country":"US",
                   "id":"1234",
                   "name":"Amazon"
                },
                "metadata":{
                   "auth_id":1513795,
                   "cardholder_present":"Y",
                   "international":false,
                   "merchant_country":"840",
                   "merchant_description":"Wal-Mart Super Center  LITHONIA       GA",
                   "merchant_id":"A100100100",
                   "merchant_state":"GA",
                   "recurring":"N",
                   "terminal_id":"13400050",
                   "timestamp":"20210813:063838MST"
                },
                "operationId":externalReference,
                "traceId":"",
                "userId":userId
            };
            
            await sendEvent(topic, event, [ payload ]);
        });

        test('Get operation Id', async () => {
            sqlQuery = 'SELECT * FROM transaction_log WHERE customer_id = $1 and situation = $2 and external_reference = $3 and parsed_month = $4 and parsed_year = $5';
            queryParams = [ customerId, "captured", externalReference, currentMonth, currentYear ];
            
            const result = await query('ledger', sqlQuery, queryParams);

            expect(result[0].situation).toBe("captured");
            operationId = result[0].id;
        });

        test('Send card "Reversed" event', async () => {

            const topic = 'cards.fact.notices';
            const event = 'tribal.cards.authorization_reversed';
            
            const payload = {
                "amount":amount,
                "authorizationId":preauthId,
                "cardId":cardId,
                "cardNickName":"my card",
                "cardholder":"",
                "country":country,
                "currency":preferredCurrency,
                "customerId":customerId,
                "issuerId":"rev-123",
                "lastFourDigits":"6386",
                "merchantInfo":{
                   "categoryCode":"3076",
                   "country":"US",
                   "id":"1234",
                   "name":"Amazon"
                },
                "metadata":{
                   "auth_id":1513795,
                   "cardholder_present":"Y",
                   "international":false,
                   "merchant_country":"840",
                   "merchant_description":"Wal-Mart Super Center  LITHONIA       GA",
                   "merchant_id":"A100100100",
                   "merchant_state":"GA",
                   "recurring":"N",
                   "terminal_id":"13400050",
                   "timestamp":"20210813:063838MST"
                },
                "operationId":operationId,
                "originalAuthorizationId":"",
                "originalExternalReference":externalReference,
                "reason":"Insufficient user credit",
                "traceId":"",
                "userId":userId
             };
            
            await sendEvent(topic, event, [ payload ]);
        });
        
    });
});
