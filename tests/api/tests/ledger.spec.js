require('dotenv').config();
const { get, post, put } = require('../../../utils/apiHelper');

describe('Customer Log API Endpoint', () => {

    let adminToken = '';
    const basePath = `/v1/plutus/admin/customer-log`;
  
    test('Authentication with tribal_super_admin token', async () => {
      const requestBody = {
        "username": process.env.TRIBAL_SA_USERNAME,
        "password": process.env.TRIBAL_SA_PASSWORD,
      };
      
      response = await post(`/v1/sts/authentication`, requestBody);

      adminToken = response.body.token
    });
    
    test('GET customer logs with all parameters', async () => {
      const params = {
        year: 2023,
        category: 'GLOBAL_CARD_FEE',
        customerID: '0bbcc49e-8a9b-42ca-83f2-2ff3a1836098',
        page: 0,
        pageSize: 100,
        product: 'CROSS_BORDER_FEE',
        month: 10
      };

      const response = await get(`${basePath}?${new URLSearchParams(params).toString()}`, adminToken);
      
      expect(Array.isArray(response.body)).toBeTruthy();
      response.body.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('year', params.year);
        expect(log).toHaveProperty('product', params.product);
        expect(log).toHaveProperty('month', params.month);
        expect(log).toHaveProperty('customerId', params.customerID);
        expect(log).toHaveProperty('category', params.category);

      });
    });

  
    test('GET customer logs with required parameters only', async () => {
      const params = {
        year: 2023,
        month: 10
      };
      
      const response = await get(`${basePath}?${new URLSearchParams(params).toString()}`, adminToken);
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  
    test('GET customer logs with invalid month parameter', async () => {
      const params = {
        year: '2023',
        month: 'invalid_month'
      };
      
      const response = await get(`${basePath}?${new URLSearchParams(params).toString()}`, adminToken);
      expect(response.body.message).toBe('invalid [month] value');
    });

    test('GET customer logs with invalid year parameter', async () => {
      const params = {
        year: 'invalid_year',
        month: '10'
      };
      
      const response = await get(`${basePath}?${new URLSearchParams(params).toString()}`, adminToken);
      expect(response.body.message).toBe('invalid [year] value');
    });

    test('GET customer logs with boundary value for year', async () => {
        const boundaryYears = [1999, 2024];
        
        for (const year of boundaryYears) {
          const params = { year: year, month: 10 };
          const response = await get(`${basePath}?${new URLSearchParams(params).toString()}`, adminToken);
          expect(response.body).toHaveLength(0);
        }
    });

    test('GET customer logs without token', async () => {
      const params = { year: 2023, month: 10 };
      const response = await get(`${basePath}?${new URLSearchParams(params).toString()}`, "invalid_token");
      expect(response.body.message).toBe('Invalid credentials');
    });

      
});