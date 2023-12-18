const { get, post, put } = require('../utils/apiHelper');
const { handleError } = require('../utils/utilsHelper');

async function runAuthenticationTest(requestBody) {
    let response;

    try {
        response = await post(`/v1/sts/authentication`, requestBody);
        //expect(typeof response.token).toBe('string');
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function passwordReset(token, requestBody) {
    let response;

    try {
        response = await post(`/v1/ml/password-reset`, requestBody, token);
        expect(response.status).toBe("ok");
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function resetPassword(token, requestBody) {
    let response;

    try {
        response = await put(`/v1/ml/password-reset`, requestBody, token);
        expect(response.status).toBe("ok");
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function createCustomer(token, requestBody) {
    let response;

    try {
        response = await post(`/v1/admin/customers`, requestBody, token);
        expect(response.id).toBe(requestBody.id);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function updateCustomerPolicy(token, requestBody) {
    let response;

    try {
        response = await put(`/v1/admin/policies/customer`, requestBody, token);
        expect(response.status).toBe('ok');
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function updateContractSignedValue(token, customerId, requestBody) {
    let response;

    try {
        response = await put(`/v1/admin/customers/'+customerId+'/contract-signed`, requestBody, token);
        expect(response.customerId).toBe(customerId);
        expect(response.contractSigned).toBe(true);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function addBusinessArea(token, customerId, requestBody) {
    let response;

    try {
        response = await post(`/v1/customers/'+customerId+'/business-areas`, requestBody, token);
        expect(response.name).toBe('Engineering');
        expect(response.customerID).toBe(customerId);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function getBusinessArea(token, customerId) {
    let response;

    try {
        response = await get(`/v1/customers/'+customerId+'/business-areas`, token);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function createUser(token, customerId, businessAreaId, requestBody) {
    
    let response;

    try {
        response = await post(`/v1/users`, requestBody, token);
        expect(response.customerId).toBe(customerId);
        expect(response.businessAreaId).toBe(businessAreaId);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function updateUserPolicy(token, requestBody) {
    let response;

    try {
        response = await put(`/v1/admin/policies/user`, requestBody, token);
        const responseBody = response.body;
        expect(response.status).toBe(200); //////////////////////////////
        expect(responseBody.status).toBe('ok');
        expect(response.status).toBe('ok');
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function changePassword(token, userId, requestBody) {
    let response;

    try {
        response = await put(`/v1/users/'+userId+'/password`, requestBody, token);
        expect(response.status).toBe('updated');
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function updateGeneralInfo(token, userId, businessAreaId, requestBody) {
    let response;

    try {
        response = await put(`/v1/users/'+userId+'/general-info`, requestBody, token);
        expect(response.businessAreaId).toBe(businessAreaId);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function createCard(token, userId, customerId, requestBody) {
    let response;

    try {
        response = await post(`/v1/cards`, requestBody, token);
        expect(response.userId).toBe(userId);
        expect(response.customerId).toBe(customerId);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function updateRole(token, requestBody) {
    let response;

    try {
        response = await put(`/v1/admin/policies/user-role`, requestBody, token);
        expect(response.status).toBe("ok");
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function introspect(token) {
    let response;

    try {
        response = await get(`/v1/sts/introspect`, token);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function preauthorize(token, requestBody) {
    let response;

    try {
        response = await post(`/v2/pre-authorize`, requestBody, token);
        expect(response.status).toBe('Approved');
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function fortunaSpecificFXrate(token, date, fromCurrency, toCurrency) {
    let response;

    try {
        response = await get(`/v1/rates/'+date+'?fromCurrency='+fromCurrency+'&toCurrency='+toCurrency`, token);
        expect(response.date).toBe(date);
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}

async function retoolCustomerLog(token, params) {
    let response;

    try {
        response = await get(`/v1/plutus/admin/customer-log?${new URLSearchParams(params).toString()}`, token);
        expect(response).toBeDefined();
        return response;
    } catch (error) {
        await handleError(error, response);
    }
}


module.exports = {
    runAuthenticationTest,
    createCustomer,
    updateCustomerPolicy,
    updateContractSignedValue,
    addBusinessArea,
    createUser,
    updateUserPolicy,
    changePassword,
    updateGeneralInfo,
    createCard,
    introspect,
    preauthorize,
    fortunaSpecificFXrate,
    updateRole,
    getBusinessArea,
    passwordReset,
    resetPassword,
    retoolCustomerLog
}