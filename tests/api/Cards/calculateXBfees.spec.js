require('dotenv').config();
const { sendEvent } = require('../../../utils/kafkaHelper');
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getRandomValue, getIsoDate } = require('../../../utils/utilsHelper');
const data = require('../../data/cards_data');

describe('Calculate XB fees', () => { //test2
 
    data.forEach(({ username, password, amount, merchantCountry, merchantCurrency, merchantAmount, provider, xbFeeRateExpected }) => {

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

        test('Send card "Capture" event', async () => {

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
                "lastFourDigits":"3986",
                "ledgerAuthId": preauthId,
                "merchantAmount":merchantAmount,
                "merchantCurrency":merchantCurrency,
                "merchantInfo":{
                    "categoryCode":"3076",
                    "country":country,
                    "id":"1234",
                    "name":"Amazon"
                },
                "metadata":{
                    "auth_id":1513795,
                    "cardholder_present":"Y",
                    "international":false,
                    "merchant_country":merchantCountry,
                    "merchant_description":"Wal-Mart Super Center  LITHONIA       GA",
                    "merchant_id":"A100100100",
                    "merchant_state":"GA",
                    "recurring":"N",
                    "terminal_id":"13400050",
                    "timestamp":"20210813:063838MST"
                },
                "operationId":"abcd_1234",
                "traceId":"",
                "userId":userId           
            };
            
            await sendEvent(topic, event, [ payload ]);
        });
        
        test('Check "Capture" row is created in transaction_log', async () => {
            const sqlQuery = 'SELECT * FROM transaction_log WHERE customer_id = $1 and situation = $2 and external_reference = $3 and parsed_month = $4 and parsed_year = $5';
            const queryParams = [ customerId, "captured", externalReference, currentMonth, currentYear ];
            
            const result = await query('ledger', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].customer_id).toBe(customerId);
            expect(result[0].situation).toBe("captured");
            expect(result[0].amount).toBe(amount.toString());

            transactionId = result[0].id;

        });

        test('Get fortuna FX rate', async () => {

            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            response = await get(`/v1/rates/${formattedDate}?fromCurrency=${preferredCurrency}&toCurrency=USD`, token);
            fxRate = response.body.rate;
        });

        test('Check the captured aggregation data has the correct values', async () => {
            const sqlQuery = 'SELECT * FROM transaction_log WHERE customer_id = $1 and situation = $2 and external_reference = $3 and parsed_month = $4 and parsed_year = $5';
            const queryParams = [ customerId, "captured", externalReference, currentMonth, currentYear ];

            const result = await query('ledger', sqlQuery, queryParams);

            expect(result).toHaveLength(1);
            const preferred_currency_amount = result[0].preferred_currency_amount;
            const customer_amount_to_use = result[0].customer_amount_to_use;
            const xbFeeRate = result[0].aggregation_data.crossBorderFeeRate;

            expect(xbFeeRate).toBe(xbFeeRateExpected.toString());
            expect(result[0].aggregation_data.crossBorderFeeAmount).toBe(Math.round(preferred_currency_amount * xbFeeRate));
            expect(result[0].aggregation_data.crossBorderFeeUSDAmount).toBe(Math.round(customer_amount_to_use * xbFeeRate));
            fxRate = (xbFeeRate == 0) ? 0 : fxRate;
            expect(result[0].aggregation_data.crossBorderFeeUSDRate).toBe(fxRate.toString());
 
        });

        test('Send card "Settled" event', async () => {

            date = getIsoDate();

            const topic = 'ledger.sys.invoices';
            const event = 'tribal.ledger.settled_transaction_completed';

            const payload = {
                "amount":amount,
                "authorizationCode":externalReference,
                "cardID":cardId,
                "currency":preferredCurrency,
                "customerID":customerId,
                "dateTime":date,
                "forced":false,
                "fxRate":1,
                "id":transactionId,
                "lastFourDigits":"3986",
                "merchantCountry":"",
                "merchantCurrency":"",
                "merchantName":"uber",
                "name":"Tribal Card",
                "provider":provider
                ,
                "providerSettlementDate":date,
                "settlementFileID":"2022-12-31",
                "tags":[
                    "galileo",
                    "atlas"
                ],
                "type":"settled",
                "userID":userId
            };

            await sendEvent(topic, event, [ payload ]);
        });
        
        test('Check "Settled" row is created in transaction_log', async () => {
            const sqlQuery = 'SELECT * FROM transaction_log WHERE customer_id = $1 and situation = $2 and external_reference = $3 and parsed_month = $4 and parsed_year = $5';
            const queryParams = [ customerId, "settled", externalReference, currentMonth, currentYear ];

            const result = await query('ledger', sqlQuery, queryParams);

            expect(result).toHaveLength(1);
            expect(result[0].customer_id).toBe(customerId);
            expect(result[0].situation).toBe("settled");

        });

        test('Check the settled aggregation data has the correct values', async () => {
            const sqlQuery = 'SELECT * FROM transaction_log WHERE customer_id = $1 and situation = $2 and external_reference = $3 and parsed_month = $4 and parsed_year = $5';
            const queryParams = [ customerId, "settled", externalReference, currentMonth, currentYear ];
            
            const result = await query('ledger', sqlQuery, queryParams);
            expect(result).toHaveLength(1);

            const preferred_currency_amount = result[0].preferred_currency_amount;
            const customer_amount_to_use = result[0].customer_amount_to_use;
            const xbFeeRate = result[0].aggregation_data.crossBorderFeeRate;

            expect(xbFeeRate).toBe(xbFeeRateExpected.toString());
            expect(result[0].aggregation_data.crossBorderFeeAmount).toBe(Math.round(preferred_currency_amount * xbFeeRate));
            expect(result[0].aggregation_data.crossBorderFeeUSDAmount).toBe(Math.round(customer_amount_to_use * xbFeeRate));
            fxRate = (xbFeeRate == 0) ? 0 : fxRate;
            expect(result[0].aggregation_data.crossBorderFeeUSDRate).toBe(fxRate.toString());

        });

    });
});
