require('dotenv').config();
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getCustomerDetails} = require('../../../utils/utilsHelper');
const data = require('../../data/janus_data');

describe('Create a new user for an existing customer', () => {

    data.data2.forEach(({ customerId, role, agreementSign}) => {
        
        let adminToken, userId, token, password, username, businessAreaId, packageName;
        let customerDetails;
    
        test('Get customer package', async () => {
            const sqlQuery = 'SELECT * FROM customers WHERE id = $1';
            const queryParams = [customerId];

            const result = await query('janus', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(customerId);

            packageName = result[0].package;
        });

        test('Authentication with tribal_super_admin token', async () => {
            const requestBody = {
                "username": process.env.TRIBAL_SA_USERNAME,
                "password": process.env.TRIBAL_SA_PASSWORD,
            };
            const response = await post(`/v1/sts/authentication`, requestBody);

            expect(response.status).toBe(200);
            expect(typeof response.body.token).toBe('string');

            adminToken = response.body.token
        });

        test('Check if business area exists, if not add a new one', async () => {
            const response = await get(`/v1/customers/${customerId}/business-areas`, adminToken);

            let foundItem = response.body.find(item => item.name === "Engineering");
            
            if (foundItem) {
                businessAreaId = foundItem.id;
            } else {
                const requestBody = {
                    "name": "Engineering"
                };

                const response = await post(`/v1/customers/${customerId}/business-areas`, requestBody, adminToken);
                
                businessAreaId = response.body[0].id;
            }
            console.log("BUSINESS AREA ID: ", businessAreaId)
        });

        test('Get country of the customer', async () => {
            const sqlQuery = 'SELECT * FROM customers WHERE id = $1';
            const queryParams = [customerId];

            const result = await query('janus', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(customerId);

            country = result[0].country;
            customerDetails = getCustomerDetails('jason.lopez', 'dev', role, country, packageName);
        });

        test('Check if business area is stored in DB', async () => {
            const sqlQuery = 'SELECT * FROM customer_business_areas WHERE customer_id = $1 and name = $2';
            const queryParams = [customerId, 'Engineering'];

            const result = await query('janus', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(businessAreaId);
        });

        test('Create a new user', async () => {
            const requestBody = {
                "customerId": customerId,
                "businessAreaID": businessAreaId,
                "jobTitle": "Sr QA",
                "firstName": "Jason",
                "lastName": role,
                "email": customerDetails.email,
                "phoneNumber": customerDetails.phoneNumber,
                "role": "user",
                "preferredLanguage": customerDetails.preferredLanguage,
                "legalRepresentative": true,
                "monthlyLimit": 2000000,
                "monthlyLimitCurrency": customerDetails.preferredCurrency,
            };

            const response = await post(`/v1/users`, requestBody, adminToken);

            userId = response.body.id;
            password = response.body.password;
            username = response.body.username;
        });

        test('Check user balance is created in Ledger hub', async () => {
            const sqlQuery = 'SELECT * FROM user_balance WHERE user_id = $1';
            const queryParams = [userId];

            const result = await query('ledger', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].user_id).toBe(userId);
        });

        if(agreementSign){
            test('Update user policy', async () => {

                const requestBody = {
                    "customerId": customerId,
                    "userId": userId,
                    "policy": {
                    "virtualCards": true,
                    "physicalCards": true,
                    "localPayments": true,
                    "internationalPayments": true,
                    "bulkPayments": true,
                    "paykii": true
                    }
                };

                const response = await put(`/v1/admin/policies/user`, requestBody, adminToken);
                expect(response.status).toBe(200);
                expect(response.body.status).toBe('ok');

            });
        }

        test('Change password', async () => {
            const requestBody = {
                "oldPassword": password,
                "newPassword": "Lunes12#Lunes12$",
                "newPasswordConfirmation": "Lunes12#Lunes12$"
            };
            
            const response = await put(`/v1/users/${userId}/password`, requestBody, adminToken);
            expect(response.body.status).toBe('updated');
        });

        test('Authentication with user token', async () => {
            const requestBody = {
                "username": username,
                "password": "Lunes12#Lunes12$",
            };

            const response = await post(`/v1/sts/authentication`, requestBody);
            expect(response.status).toBe(200);
            expect(typeof response.body.token).toBe('string');

            token = response.body.token;
        });

        test('Update general info', async () => {
            const requestBody = {
                "businessAreaId": businessAreaId,
                "jobTitle": "Sr QA",
                "firstName": "Jason",
                "lastName": role,
                "email": customerDetails.email,
                "phoneNumber": customerDetails.phoneNumber,
                "role": role,
                "preferredLanguage": customerDetails.preferredLanguage,
            };

            const response = await put(`/v1/users/${userId}/general-info`, requestBody, token);
            expect(response.body.businessAreaId).toBe(businessAreaId);
        });

        test('Create a new card', async () => {
            const requestBody = {
                "currency": "USD",
                "nickname": "new card",
                "cardType": "virtual",
                "cardSubtype": "",
                "cardLimit": 15000,
                "tags": [
                  "office-expenses"
                ]
            };

            const response = await post(`/v1/cards`, requestBody, token);
            expect(response.body.userId).toBe(userId);
            expect(response.body.customerId).toBe(customerId);

        });

        test('Update role', async () => {
            const requestBody = {
                "customerId": customerId,
                "userId": userId,
                "Role": role
            };
            
            const response = await put(`/v1/admin/policies/user-role`, requestBody, adminToken);
            expect(response.body.status).toBe("ok");
        });

    });
});
