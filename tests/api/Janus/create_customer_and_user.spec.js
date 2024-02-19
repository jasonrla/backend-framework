require('dotenv').config();
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getCustomerDetails, logToTxt} = require('../../../utils/utilsHelper');
const { generateAdminToken} = require('../../../utils/utilFunctions');
const data = require('../../data/janus_data');
const payload = require('../../data/data.json');

let adminToken;

describe('Create new customer and user', () => {
   
    beforeAll(async () => {
        adminToken = await generateAdminToken();
    });

    data.data1.forEach(({country, packageName, role, agreementSign}) => {
        
        let customerId, userId, token, password, username, businessAreaId;
        let customerDetails = getCustomerDetails('jason.lopez', 'dev', role, country, packageName);
        
        test('Create a new customer', async () => {
        
            const requestBody = payload.janus.newCustomer;

            requestBody.id = customerDetails.customerId;
            requestBody.name = customerDetails.name;
            requestBody.legalName = customerDetails.name;
            requestBody.country = customerDetails.country;
            requestBody.address.line1 = customerDetails.address;
            requestBody.address.country = customerDetails.country;
            requestBody.address.state = customerDetails.state;
            requestBody.address.city = customerDetails.state;
            requestBody.package = customerDetails.package;
            requestBody.defaultCurrency = customerDetails.defaultCurrency;

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
                const requestBody = payload.janus.updateCustomerPolicy
                requestBody.id = customerId;
                
                const response = await put(`/v1/admin/policies/customer`, requestBody, adminToken);
                expect(response.body.status).toBe('ok');
            });
        }

        if(agreementSign){
            test('Update contract signed value', async () => {
                const requestBody = payload.janus.contractSigned;

                const response = await put(`/v1/admin/customers/${customerId}/contract-signed`, requestBody, adminToken);
                expect(response.body.customerId).toBe(customerId);
                expect(response.body.contractSigned).toBe(true);
            });
        }

        test('Add new business area', async () => {
            const requestBody = payload.janus.newBusinessArea;

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
            
            const requestBody = payload.janus.newUser; 

            requestBody.customerId = customerId;
            requestBody.businessAreaID = businessAreaId;
            requestBody.lastName = role;
            requestBody.email = customerDetails.email;
            requestBody.phoneNumber = customerDetails.phoneNumber;
            requestBody.preferredLanguage = customerDetails.preferredLanguage;
            requestBody.monthlyLimitCurrency = customerDetails.preferredCurrency;
       
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
                const requestBody = payload.janus.updateUserPolicy;
                requestBody.customerId = customerId;
                requestBody.userId = userId;

                const response = await put(`/v1/admin/policies/user`, requestBody, adminToken);
                expect(response.status).toBe(200); 
                expect(response.body.status).toBe('ok');
            });
        }

        test('Change password', async () => {
            const requestBody = payload.janus.changePassword;
            requestBody.oldPassword = password;
            requestBody.newPassword = "Lunes12#Lunes12$";
            requestBody.newPasswordConfirmation = "Lunes12#Lunes12$";

            const response = await put(`/v1/users/${userId}/password`, requestBody, adminToken);
            expect(response.body.status).toBe('updated');

        });

        test('Authentication with user token', async () => {
            const requestBody = payload.janus.authentication;
            requestBody.username = username;
            requestBody.password = "Lunes12#Lunes12$";

            const response = await post(`/v1/sts/authentication`, requestBody);
            expect(response.status).toBe(200);
            expect(typeof response.body.token).toBe('string');

            token = response.body.token;
        });

        test('Update general info', async () => {
            const requestBody = payload.janus.updateGeneralInfo;
            requestBody.businessAreaId = businessAreaId;
            requestBody.lastName = role;
            requestBody.email = customerDetails.email;
            requestBody.phoneNumber = customerDetails.phoneNumber;
            requestBody.role = role;
            requestBody.preferredLanguage = customerDetails.preferredLanguage;

            const response = await put(`/v1/users/${userId}/general-info`, requestBody, token);
            expect(response.body.businessAreaId).toBe(businessAreaId);

        });

        test('Create a new card', async () => {
            const requestBody = payload.aurora.newCard;

            const response = await post(`/v1/cards`, requestBody, token);
            expect(response.body.userId).toBe(userId);
            expect(response.body.customerId).toBe(customerId);

        });

        test('Update role', async () => {
            const requestBody = payload.janus.updateRole;
            requestBody.customerId = customerId;
            requestBody.userId = userId;
            requestBody.role = role;

            const response = await put(`/v1/admin/policies/user-role`, requestBody, adminToken);
            expect(response.body.status).toBe("ok");

        });

    });
});
