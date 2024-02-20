const { get, post, put } = require('./apiHelper');
require('dotenv').config();

async function generateAdminToken(){
    const requestBody = {
        "username": process.env.TRIBAL_SA_USERNAME,
        "password": process.env.TRIBAL_SA_PASSWORD,
    };

    const response = await post(`/v1/sts/authentication`, requestBody);

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');

    return response.body.token
}

async function generateToken(username, password){
    const requestBody = {
        "username": username,
        "password": password,
    };

    const response = await post(`/v1/sts/authentication`, requestBody);

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');

    return response.body.token
}

async function introspect(token){
    console.log(token);
    response = await get(`/v1/sts/introspect`, token);
    return response.body;
}

module.exports = { 
    generateAdminToken,
    generateToken,
    introspect
};
