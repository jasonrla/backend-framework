require('dotenv').config();
const { get, post, postBulkAdjustments } = require('../../../utils/apiHelper');
const { query, getCustomerDetails, logToTxt, generateUUID, getRandomDecimalNumber} = require('../../../utils/utilsHelper');
const { generateToken, introspect, generateAdminToken} = require('../../../utils/utilFunctions');
const data = require('../../data/janus_data');
const payload = require('../../data/data.json');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


describe('Create transactions', () => {

    data.data5.forEach(({username, password, months_quantity}) => {

        let customerId, token, prefCurrency;

        beforeAll(async () => {
            token = await generateToken(username, password);
            result = await introspect(token);
            customerId = result.customerId;
            prefCurrency = result.customerDefaultCurrency;
            
        });

        test('Create balances for pasth months', async () => {
            const result = await createPastBalances(customerId, months_quantity);
            console.log(result);
        });

        test.only('Insert transactions for past months', async () => {
            const result = await createFakeCardTransactions(token, months_quantity, prefCurrency);
            console.log(result); 
        });

        test.only('Create a CSV with Financing Fee and Global Card Fee', async () => {
            await createBulkFees(customerId, prefCurrency, months_quantity);
        });

    });
});

async function createBulkFees(customerId, prefCurrency, months) {

    const path = './tests/data/out.csv';
    const currentDate = new Date();

    for(let i = 1; i < months+1; i++){
        const data = [];
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i);

        data.push({
            customerID: customerId,
            product: 'FINANCING_FEE',
            description: 'bulkFee',
            comments: 'https://team-1613076712777.atlassian.net/browse/TRIB-10676',
            amount: getRandomDecimalNumber(3),
            currency: prefCurrency,
            usdAmount: 0,
            approvedBy: 'Testing',
            correlationID: 1234
        });
        data.push({
            customerID: customerId,
            product: 'CROSS_BORDER_FEE',
            description: 'bulkFee',
            comments: 'https://team-1613076712777.atlassian.net/browse/TRIB-10676',
            amount: getRandomDecimalNumber(3),
            currency: prefCurrency,
            usdAmount: 0,
            approvedBy: 'Testing',
            correlationID: 1234
        });
    

    const csvWriter = createCsvWriter({
        path: path,
        header: [
            {id: 'customerID', title: 'customerID'},
            {id: 'product', title: 'product'},
            {id: 'description', title: 'description'},
            {id: 'comments', title: 'comments'},
            {id: 'amount', title: 'amount'},
            {id: 'currency', title: 'currency'},
            {id: 'usdAmount', title: 'usdAmount'},
            {id: 'approvedBy', title: 'approvedBy'},
            {id: 'correlationID', title: 'correlationID'},
        ]
    });

    await csvWriter.writeRecords(data);
    const admnToken = await generateAdminToken();

    await bulkAdjustment(path, newDate.getMonth() + 1, newDate.getFullYear(), admnToken)
}
}


async function bulkAdjustment(filePath, month, year, adminToken) {
    try {
        const endpoint = '/v1/plutus/admin/bulk/manual-adjustment';
        const response = await postBulkAdjustments(endpoint, filePath, month, year, adminToken);
        return response.body;
    } catch (error) {
        console.error(error.response);
        throw error;
    }
}

async function createFakeCardTransactions(token, months, prefCurrency){
    
    const result = await get(`/v1/cards`, token);
    const results = await insertFakeCardSettled(result.body[0].customerId, result.body[0].userId, result.body[0].cardId, months, prefCurrency);
    return results;
}

async function insertFakeCardSettled(customerId, userId, cardId, months, prefCurrency){
    const results = [];
    const currentDate = new Date();

    for(let i = 0; i < months+1; i++){
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i);
        const sqlQuery = `INSERT INTO public.transaction_log (id, situation, product, customer_id, user_id, card_id, external_reference, merchant, merchant_country, merchant_currency, merchant_amount, amount, currency, fx_rate, metadata, tags, card_amount_to_use, user_amount_to_use, customer_amount_to_use, parsed_day, parsed_month, parsed_year, updated_at, user_name, card_amount_to_use_currency, user_amount_to_use_currency, customer_amount_to_use_currency, card_number, preferred_currency, preferred_currency_amount, usd_amount, preferred_currency_amount_fx_rate, revenue, provider, cross_border_fee_amount, aggregation_data) 
        VALUES ($1, 'settled', 'CARD', $2, $3, $4, '1513795', 'Wal-Mart Super Center  ', 'US', 'USD', 1800, 1800, 'USD', 1.000000, '{"authId": 1513795, "id": "SwwYqn4lSg66WHRFVKlmtw", "international": false, "maskedCardNumber": "6056", "merchant": "Wal-Mart Super Center  ", "network": "Mastercard", "originalId": 0, "provider": "galileo", "riskScore": "None", "timestamp": "20210813:063838MST"}', '[]', 1800, 1800, 1800, 12, 
        $5, $6, '2024-01-12 16:27:29.818769', 'Jason super_admin', 'USD', 'USD', 'USD', '6056', 
        $7, 1800, 1800, 1.000000, 1.000000, 'galileo', 0, '{"crossBorderFeeAmount": 0, "crossBorderFeeRate": "0", "crossBorderFeeUSDAmount": 0, "crossBorderFeeUSDRate": "0"}');`;
        const queryParams = [generateUUID(), customerId, userId, cardId, newDate.getMonth() + 1, newDate.getFullYear(), prefCurrency];
        const result = await query('ledger', sqlQuery, queryParams);
        results.push(result);
    }
    return results;
}

async function createCard(token){
    const requestBody = payload.aurora.newCard;
    const response = await post(`/v1/cards`, requestBody, token);
    return response.body;
}

async function createPastBalances(customerId, months){
    const currentBalance = await getCustomerBalance(customerId);
    const currentDate = new Date(currentBalance[0].period_year, currentBalance[0].period_month - 1);
    const results = [];

    for(let i = 1; i <= months; i++){
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i);
        const result = await insertNewCustomerBalance(currentBalance[0], newDate.getMonth() + 1, newDate.getFullYear());
        results.push(result);
    }

    return results;
}

async function insertCustomerMetadata(customerId, keyName){
    const sqlQuery = `INSERT INTO customer_metadata (customer_id,key_name,key_value,category,"status",created_at,updated_at,updated_by) 
    VALUES ($1, $2,'true','extended-payment-terms','visible','2024-01-01 07:41:45.637','2024-01-01 07:41:45.637','529353da-66c7-46d2-a7ec-ccc3a6eb08e9')`;
    const queryParams = [customerId, keyName];
    const result = await query('janus', sqlQuery, queryParams);
    return result;
}


async function getCustomerBalance(customerId, month = '', year = ''){
    let monthToQuery = month === '' ? 'month' : month;
    let yearToQuery = year === '' ? 'year' : year;

    if(month === ''){
        const currentDate = new Date();
        monthToQuery = currentDate.getMonth() + 1;
        yearToQuery = currentDate.getFullYear();
    }
    const sqlQuery = `SELECT * FROM customer_balance WHERE customer_id = $1 AND period_month = $2 AND period_year = $3`;
    const queryParams = [customerId, monthToQuery, yearToQuery];
    const result = await query('ledger', sqlQuery, queryParams);
    return result;
}

async function insertNewCustomerBalance(balance, newMonth, newYear){
    const sqlQuery = `INSERT INTO customer_balance 
    (customer_id, period_month, period_year, currency, credit_limit, temp_limit, advanced_payment, other_credits, past_credits, dynamic_limit, expenditure, payment_terms, updated_at, updated_by, exposure, preferred_currency, past_due, total_payins, total_rewards, past_due_preferred_currency, total_credits, total_fees, last_month_balance, pref_currency_credit_limit, pref_currency_temp_limit, pref_currency_dynamic_limit, pref_currency_expenditure, pref_currency_total_payins, pref_currency_total_credits, pref_currency_total_fees) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`;
    
    const queryParams = [
        balance.customer_id, 
        newMonth, 
        newYear, 
        balance.currency, 
        balance.credit_limit, 
        balance.temp_limit, 
        balance.advanced_payment, 
        balance.other_credits, 
        balance.past_credits, 
        balance.dynamic_limit, 
        balance.expenditure, 
        balance.payment_terms, 
        balance.updated_at, 
        balance.updated_by, 
        balance.exposure, 
        balance.preferred_currency, 
        balance.past_due, 
        balance.total_payins, 
        balance.total_rewards, 
        balance.past_due_preferred_currency, 
        balance.total_credits, 
        balance.total_fees, 
        balance.last_month_balance, 
        balance.pref_currency_credit_limit, 
        balance.pref_currency_temp_limit, 
        balance.pref_currency_dynamic_limit, 
        balance.pref_currency_expenditure, 
        balance.pref_currency_total_payins, 
        balance.pref_currency_total_credits, 
        balance.pref_currency_total_fees
    ];
    console.log(queryParams);
    const result = await query('ledger', sqlQuery, queryParams);
    return result; 
}