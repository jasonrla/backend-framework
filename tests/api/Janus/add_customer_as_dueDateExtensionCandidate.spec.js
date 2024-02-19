require('dotenv').config();
const { get, post, put } = require('../../../utils/apiHelper');
const { query, getCustomerDetails, logToTxt} = require('../../../utils/utilsHelper');
const { generateAdminToken} = require('../../../utils/utilFunctions');
const data = require('../../data/janus_data');
const payload = require('../../data/data.json');

let adminToken;

describe('Add a customer as dueDateExtensionCandidate', () => {
   
    beforeAll(async () => {
    });

    data.data4.forEach(({customerId}) => {
        
        test('Insert new register in customer_metadata', async () => {
            const result = await insertCustomerMetadata(customerId, 'dueDateExtensionCandidate');
            expect(result).toBe(1);
        });

    });
});

async function insertCustomerMetadata(customerId, keyName){
    const sqlQuery = `INSERT INTO customer_metadata (customer_id,key_name,key_value,category,"status",created_at,updated_at,updated_by) 
    VALUES ($1, $2,'true','extended-payment-terms','visible','2024-01-01 07:41:45.637','2024-01-01 07:41:45.637','529353da-66c7-46d2-a7ec-ccc3a6eb08e9')`;
    const queryParams = [customerId, keyName];
    const result = await query('janus', sqlQuery, queryParams);
    return result;
}
