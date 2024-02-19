require('dotenv').config();
const { sendEvent } = require('../../../utils/kafkaHelper');
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getRandomValue, getIsoDate } = require('../../../utils/utilsHelper');
const data = require('../../data/payments_data');

describe('Payout reversed', () => { //test11
 
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

        test('Preauthorize paymeny transaction', async () => {

            const requestBody = {
                "product":"PAYMENT",
                "userId": userId,
                "customerId": customerId,
                "userName": "John Doe",
                "cardId": "",
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

        test('Send Payout "Capture" event', async () => {

            const topic = 'ledger.sys.invoices';
            const event = 'tribal.pay.payout_finalized.v2';
            
            const payload = {
                "bulkPaymentId":"",
                "comments":"Payment Success",
                "customerId":customerId,
                "customerName":"Tribal SA CV",
                "description":"Payment of paper supplier",
                "internalFailureReason":"PAYOUT_COMPLETED",
                "notifyTo":[
                   "jason.lopez@tribal.credit"
                ],
                "payee":{
                   "amount":amount,
                   "bank":{
                      "account":"12345678",
                      "country":"USD",
                      "name":"Bank of America"
                   },
                   "creditorAccount":{
                      "accountNumber":"123456798765",
                      "transferType":"BANK_TRANSFER",
                      "type":"S"
                   },
                   "currency":"USD",
                   "email":"jason.lopez@tribal.credit",
                   "id":"test-beneficiary",
                           "name":""
                },
                "payer":{
                   "amount":amount,
                   "currency":"USD",
                   "email":"jason.lopez@tribal.credit",
                   "fxRate":1,
                   "name":"John Smith"
                },
                "paymentId":"6fa6a81a-df9d-46bf-ad98-224cb3362444",
                "preauthorizationId":preauthId,
                "provider":{
                   "name":"currencycloud",
                   "references":{
                      "ccid":"PAY_1002"
                   }
                },
                "status":"completed",
                "triggeredAt":"",
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

        test('Send Payout "Reversed" event', async () => {

            const topic = 'ledger.sys.invoices';
            const event = 'tribal.pay.payout_cancelled';
            
            const payload = {
                "bulkPaymentId":"",
                "cause":"returned",
                "customerId":customerId,
                "customerName":"Tribal SA CV",
                "description":"Payment of paper supplier",
                "internalFailureReason":"PAYOUT_FAILED",
                "notifyTo":[
                   "test@tribal.credit"
                ],
                "payee":{
                   "amount":amount,
                   "bank":{
                      "account":"12345678",
                      "country":"USD",
                      "name":"Bank of America"
                   },
                   "creditorAccount":{
                      "accountNumber":"+5512345678",
                      "transferType":"PIX",
                      "type":"PHONE"
                   },
                   "currency":"USD",
                   "email":"test@tribal.credit",
                   "id":"test-beneficiary",
                   "name":""
                },
                "payer":{
                   "amount":amount,
                   "currency":"MXN",
                   "email":"test@tribal.credit",
                   "fxRate":1,
                   "name":"John Smith"
                },
                "paymentId":"6fa6a81a-df9d-46bf-ad98-224cb3362a29",
                "preauthorizationId":preauthId,
                "provider":"currencycloud",
                "triggeredAt":"",
                "userId":userId
            };
            
            await sendEvent(topic, event, [ payload ]);
        });

        test('Check "Reversed" row is created in transaction_log', async () => {
            const sqlQuery = 'SELECT * FROM transaction_log WHERE customer_id = $1 and situation = $2 and external_reference = $3 and parsed_month = $4 and parsed_year = $5';
            const queryParams = [ customerId, "reversed", externalReference, currentMonth, currentYear ];
            
            const result = await query('ledger', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].customer_id).toBe(customerId);
            expect(result[0].situation).toBe("reversed");
            expect(result[0].amount).toBe((amount*-1).toString());

            transactionId = result[0].id;

        });
    });
});