require('dotenv').config();
const { get, post, put } = require('../../../utils/apiHelper');
const { query} = require('../../../utils/utilsHelper');
const data = require('../../data/janus_data');

describe('Update user password', () => {
   
    data.data3.forEach(({ username}) => {
        
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
