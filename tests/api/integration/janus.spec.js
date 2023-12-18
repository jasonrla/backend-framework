require('dotenv').config();
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getCustomerDetails} = require('../../../utils/utilsHelper');

describe('Create new customer and user', () => {
   
    const dataCountries = [
        { country: "MX", packageName: "next", role:"super_admin", agreementSign: false}//,{ country: "USA", packageName: "next", role:"super_admin", agreementSign: true},
        //{ country: "Egypt", packageName: "next", role:"super_admin", agreementSign: true},{ country: "Emirates", packageName: "next", role:"super_admin", agreementSign: true},
        //{ country: "Uruguay", packageName: "next", role:"super_admin", agreementSign: true}
    ];

    dataCountries.forEach(({ country, packageName, role, agreementSign}) => {
        
        let adminToken, customerId, userId, token, password, username, businessAreaId;
        let customerDetails = getCustomerDetails('jason.lopez', '@tribal.credit', 'dev', role, country, packageName);

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
        
        test('Create a new customer', async () => {

            const requestBody = {
                "id": customerDetails.customerId,
                "name": customerDetails.name,
                "legalName": customerDetails.name,
                "country": customerDetails.country,
                "parentCompanyId": "",
                "address": {
                    "line1": customerDetails.address,
                    "line2": "",
                    "country": customerDetails.country,
                    "state": customerDetails.state,
                    "city":  customerDetails.state,
                    "postalCode": "123456"
                },
                "taxID": "GEI180507ID3",
                "industryCode": "IND-001",
                "sectorCode": "SEC-001",
                "vip": false,
                "package": customerDetails.package,
                "approvedCreditLine": 100000000,
                "defaultCurrency": customerDetails.defaultCurrency,
                "exposure": "1x"
            };

            const response = await post(`/v1/admin/customers`, requestBody, adminToken);
            expect(response.body.id).toBe(requestBody.id);

            customerId = response.body.id;
        });

        test('Check customer balance is created in Ledger hub', async () => {
            const sqlQuery = 'SELECT * FROM customer_balance WHERE customer_id = $1';
            const queryParams = [customerId];

            const result = await query('ledger', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].customer_id).toBe(customerId);

        });

        if(agreementSign){
            test('Update customer policy', async () => {
                const requestBody = {
                    "id": customerId,
                    "virtualCards": true,
                    "physicalCards": true,
                    "bulkPayments": true,
                    "localPayments": true,
                    "internationalPayments": true,
                    "paykii": true
                };

                const response = await put(`/v1/admin/policies/customer`, requestBody, adminToken);
                expect(response.body.status).toBe('ok');
            });
        }

        if(agreementSign){
            test('Update contract signed value', async () => {
                const requestBody = {
                    "contractSigned": true
                };

                const response = await put(`/v1/admin/customers/${customerId}/contract-signed`, requestBody, adminToken);
                expect(response.body.customerId).toBe(customerId);
                expect(response.body.contractSigned).toBe(true);
            });
        }

        test('Add new business area', async () => {
            const requestBody = {
                "name": "Engineering"
            };

            const response = await post(`/v1/customers/${customerId}/business-areas`, requestBody, adminToken);
            expect(response.body.name).toBe('Engineering');
            expect(response.body.customerID).toBe(customerId);

            businessAreaId = response.body.id;

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

            expect(response.body.customerId).toBe(customerId);
            expect(response.body.businessAreaId).toBe(businessAreaId);

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

describe('Create a new user for an existing customer', () => {
   
    const data = [
        { customerId: "c1ea3441-5a86-4353-b0da-8d7eccf5bb72", role:"admin", agreementSign: false}
    ];

    data.forEach(({ customerId, role, agreementSign}) => {
        
        let adminToken, userId, token, password, username, businessAreaId;
        let customerDetails;

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
            customerDetails = getCustomerDetails('jason.lopez', '@tribal.credit', 'dev', role, country);
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

describe('Update user password', () => {
   
    const data = [
        { username: "jason.lopez+dev_ae_super_admin_46644@tribal.credit"},
        { username: "jason.lopez+dev_mx_user_d0dve@tribal.credit"},
        { username: "jason.lopez+dev_ae_user_yj4rp@tribal.credit"},
    ];

    data.forEach(({ username}) => {
        
        let adminToken, customerId, magicLink;

        test('Authentication with tribal_super_admin token', async () => {
            const requestBody = {
                "username": process.env.TRIBAL_SA_USERNAME,
                "password": process.env.TRIBAL_SA_PASSWORD,
            };

            const response = await post(`/v1/sts/authentication`, requestBody);
            expect(typeof response.body.token).toBe('string');

            adminToken = response.token
        });
        
        test('Start password reset', async () => {
            const requestBody = {
                "username": username
            };

            const response = await post(`/v1/ml/password-reset`, requestBody, adminToken);
            expect(response.body.status).toBe("ok");
        });

        test('Get customerId', async () => {
            const sqlQuery = 'SELECT * FROM customer_users WHERE username = $1';
            const queryParams = [username];

            const result = await query('janus', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].username).toBe(username);

            customerId = result[0].customer_id;
        });

        test('Get magic link', async () => {
            const sqlQuery = 'SELECT * FROM user_magic_links WHERE customer_id = $1 order by created_at desc limit 1';
            const queryParams = [customerId];
            
            const result = await query('janus', sqlQuery, queryParams);
            
            expect(result).toHaveLength(1);
            expect(result[0].customer_id).toBe(customerId);

            magicLink = result[0].magic_link;
        });

        test('Reset password', async () => {
            const requestBody = {
                "magicLink": magicLink,
                "newPassword": "Lunes12#Lunes12$",
                "newPasswordConfirmation": "Lunes12#Lunes12$"
            };

            const response = await put(`/v1/ml/password-reset`, requestBody, adminToken);
            expect(response.body.status).toBe("ok");
        });

        test('Check authentication', async () => {
            const requestBody = {
                "username": username,
                "password": "Lunes12#Lunes12$",
            };

            const response = await post(`/v1/sts/authentication`, requestBody);
            expect(typeof response.body.token).toBe('string');
            expect(response.body.tokenType).toBe("bearer");
        });
    });
});