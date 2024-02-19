const fs = require('fs');
const { closePools, executeQueryLedger, executeQueryJanus, insertQueryJanus, insertQueryLedger } = require('../utils/postgresHelper');

async function query(hub, query, params) {
    let records;
    let maxAttempts = 20
    let delay = 1000;
    let currentAttempt = 0;

    logToTxt(hub.toUpperCase(),"QUERY:",query)
    logToTxt(hub.toUpperCase(),"PARAMS:",params)

    if(query.startsWith("SELECT")){
        do {
            if (hub == 'ledger') {
                records = await executeQueryLedger(query, params);
            }else if (hub == 'janus') {
                records = await executeQueryJanus(query, params);
            }

            if (records.length === 0) {
                logToTxt(`Reading database... Attempt ${currentAttempt}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                currentAttempt++;
            }
            else{
                break;
            }
        } while (records.length === 0 && currentAttempt < maxAttempts);
        
        if (records.length === 0) {
            logToTxt("The maximum number of attempts was exceeded without finding any records.");
            return [];
            //throw new Error("The maximum number of attempts was exceeded without finding any records.");
        } else {
            logToTxt("QUERY RESULT:", records);
            return records;
        }
    }
    else if (query.startsWith("UPDATE") || (query.startsWith("DELETE"))){
        if (hub === 'ledger') {
            records = await executeQueryLedger(query, params);
            logToTxt("LEDGER QUERY RESULT:", records);
        }
    }
    else if (query.startsWith("INSERT")){
        if (hub === 'janus') {
            records = await insertQueryJanus(query, params);
            logToTxt("JANUS INSERT RESULT:", records);
            return records;
        }
        else if (hub === 'ledger') {
            records = await insertQueryLedger(query, params);
            logToTxt("LEDGER INSERT RESULT:", records);
            return records;
        }
    }
}

async function closeDBPools(){
    return await closePools();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomNumber(length) {
    const num = Math.random() * (99999 - 10000) + 10000;
    return num;
}

function getRandomDecimalNumber(length) {
    const num = Math.random() * (999 - 100) + 100;
    return Number(num.toFixed(2));
}

function getRandomValue(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

function getCustomerDetails(user, env, finalRole, country, packageName){

    let country_name, defaultCurrency, state, address, name, phoneNumber, preferredLanguage, preferredCurrency, role;
    let company_number = getRandomValue(2);
    let domain = 'tribal.credit';

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

    switch(finalRole){
        case "admin":
            role = "adm";
            break;
        case "user":
            role = "usr";
            break;
        case "super_admin":
            role = "sadm";
            break;
        case "accountant":
            role = "acc";
            break;
    }

    if(packageName != ''){
        switch(packageName){
            case "next":
                packageNameAbbr = "nxt";
                break;
            case "capital90":
                packageNameAbbr = "c90";
                break;
            case "capital60":
                packageNameAbbr = "c60";
                break;
            case "capital":
                packageNameAbbr = "cap";
                break;
        }   
    }

    const email_1 = [env.toLowerCase(), country_name.toLowerCase(), role.toLowerCase(), packageNameAbbr, company_number]
    const email_2 = [user,email_1.join("_")];
    const email_3 = [email_2.join("+"),domain];
    const email = email_3.join("@");


    return {
        "customerId": generateUUID(),
        "name": name,
        "role": finalRole,
        "country": country_name,
        "email": email,
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

function getCurrentMonthNumber() {
    const date = new Date();
    const monthNumber = date.getMonth() + 1;
    return monthNumber;
}

function getCurrentYearNumber() {
    const date = new Date();
    const yearNumber = date.getFullYear();
    return yearNumber;
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

function logToTxtData(...args) {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    if (args[1] === '/v1/users' || args[1] === '/v1/cards') {
        const formattedArgs = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
        const fileName = `log_data.txt`;
        let specificData = {};
        
        //let username;

        try {
            if (args[1] === '/v1/users') {
                //username = args[3].username
                specificData = "customerId: " + args[3].customerId + `\n` + "username: " + args[3].username ;
            } else if (args[1] === '/v1/cards') {
                //"customerId": args[3].customerId, "userId": args[3].userId, 
                specificData = "cardId: " + args[3].cardId + `\n`;
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }

        const message = specificData;//JSON.stringify(specificData, null, 2);
        console.log(message);

        //const fileName = `log_data.txt`;

        fs.appendFile(fileName, `\n${message}`, (err) => {
            if (err) {
                console.error(`Error writing to ${fileName}:`, err);
            }
        });
    }
}

function logToTxt(...args) {
    // Get current date and time
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  
    // Convert objects to pretty-printed JSON strings
    const formattedArgs = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg));
  
    // Concatenate all arguments into a single message
    const message = formattedArgs.join(' ');
  
    // Log to console
    console.log(message);
  
    // Append to text file with current date and time in the name
    const fileName = `log.txt`;
  
    fs.appendFile(fileName, `${formattedDate}:\n${message}\n`, (err) => {
      if (err) {
        console.error(`Error writing to ${fileName}:`, err);
      }
    });
}

module.exports = { 
    logToTxt,
    logToTxtData,
    closeDBPools, 
    query, 
    getRandomValue, 
    getCustomerDetails, 
    getIsoDate, 
    generateUUID, 
    handleError,
    getCurrentMonthNumber,
    getCurrentYearNumber,
    getRandomDecimalNumber,
    getRandomNumber
};
