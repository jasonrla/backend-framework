
const { closePools, executeQueryLedger, executeQueryJanus } = require('../utils/postgresHelper');

async function query(hub, query, params) {
    let records;
    let maxAttempts = 20
    let delay = 1000;
    let currentAttempt = 0;

    console.log(hub.toUpperCase(),"QUERY:",query)
    console.log(hub.toUpperCase(),"PARAMS:",params)

    if(query.startsWith("SELECT")){
        do {
            if (hub == 'ledger') {
                records = await executeQueryLedger(query, params);
            }else if (hub == 'janus') {
                records = await executeQueryJanus(query, params);
            }

            if (records.length === 0) {
                console.log(`Reading database... Attempt ${currentAttempt}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                currentAttempt++;
            }
            else{
                break;
            }
        } while (records.length === 0 && currentAttempt < maxAttempts);
        
        if (records.length === 0) {
            throw new Error("The maximum number of attempts was exceeded without finding any records.");
        } else {
            console.log("QUERY RESULT:", records);
            return records;
        }
    }
    else if (query.startsWith("UPDATE") || (query.startsWith("DELETE"))){
            if (hub == 'ledger') {
                records = await executeQueryLedger(query, params);
                console.log("LEDGER QUERY RESULT:", records);
        }
    }
}

async function closeDBPools(){
    return await closePools();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomValue(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

function getCustomerDetails(user, domain, env, finalRole, country, packageName=''){

    let country_name, defaultCurrency, state, address, name, phoneNumber, preferredLanguage, preferredCurrency;
    let company_number = getRandomValue(5);

    switch(country){
        case "Mexico":
        case "MX":
            country_name = 'MX';
            defaultCurrency = 'MXN';
            state = 'CDMX';
            address = 'Av Mexico 123';
            name = "Mexico company - " + company_number;
            phoneNumber = '+529876786544';
            preferredLanguage = 'ES';
            preferredCurrency = 'MXN';
            break;
        case "USA":
        case "US":
            country_name = 'US';
            defaultCurrency = 'USD';
            state = 'New York';
            address = 'Washington ave';
            name = "United States company - " + company_number;
            phoneNumber = '+19293452349';
            preferredLanguage = 'EN';
            preferredCurrency = 'USD';
            break;
        case "Egypt":
        case "EG":            
            country_name = 'EG';
            defaultCurrency = 'EGP';
            state = 'Cairo';
            address = 'Av Las Piramides';
            name = "Egypt company - " + company_number;
            phoneNumber = '+209293452349';
            preferredLanguage = 'EN';
            preferredCurrency = 'USD';
            break;
        case "Emirates":
        case "AE":
            country_name = 'AE';
            defaultCurrency = 'AED';
            state = 'Dubai';
            address = 'Av Dubai';
            name = "Emiratos Arabes company - " + company_number;
            phoneNumber = '+966989898900';
            preferredLanguage = 'EN';
            preferredCurrency = 'USD';
            break;
        case "Uruguay":
        case "UY":
            country_name = 'UY';
            defaultCurrency = 'UYU';
            state = 'Montevideo';
            address = 'Av Los Charruas';
            name = "Uruguay company - " + company_number;
            phoneNumber = '+59898989990';
            preferredLanguage = 'EN';
            preferredCurrency = 'USD';
            break;
    }

    return {
        "customerId": generateUUID(),
        "name": name,
        "role": finalRole,
        "country": country_name,
        "email": user + "+" + env.toLowerCase() + "_" + country_name.toLowerCase() + "_" + finalRole.toLowerCase() + "_" + company_number + domain,
        "defaultCurrency": defaultCurrency,
        "state": state,
        "address": address,
        "phoneNumber": phoneNumber,
        "preferredLanguage": preferredLanguage,
        "preferredCurrency": preferredCurrency,
        "package": packageName
    }
}

function getIsoDate() {
    const date = new Date();
    const isoDate = date.toISOString();
    return isoDate;
}

function generateUUID() {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c === 'x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

async function handleError(error, apiResponse) {
    console.error("Error during the test:", error.message);
    console.error("Response:", apiResponse);
    throw error;
}

module.exports = { 
    closeDBPools, 
    query, 
    getRandomValue, 
    getCustomerDetails, 
    getIsoDate, 
    generateUUID, 
    handleError
};
