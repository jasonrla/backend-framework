const supertest = require('supertest');

const url = "https://dev.api.tribalcredit.io";
const request = supertest(url);

async function get(endpoint, token = null) {
  let res;

  try {
    let req = request.get(endpoint);
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    res = await req;
    console.log("GET:",endpoint,"\nRESPONSE:",res.body);
    return res;

  } catch (error) {
    await handleError(error, res);
  }
}

async function post(endpoint, body, token = null) {
  let res;

  try {
    let req = request.post(endpoint).send(body);
    console.log("POST",endpoint,"\nREQUEST:",body);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    res = await req;
    console.log("POST",endpoint,"\nRESPONSE:",res.body);
    return res;

  } catch (error) {
    await handleError(error, res);
  }
}

async function put(endpoint, body, token = null) {
  let res;

  try {
    let req = request.put(endpoint).send(body);
    console.log("PUT",endpoint,"\nREQUEST:",body);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    res = await req;
    console.log("PUT",endpoint,"\nRESPONSE:",res.body);
    return res;

  } catch (error) {
    await handleError(error, res);
  }
}

async function handleError(error, apiResponse) {
  console.error("Error during the test:", error.message);
  console.error("Response:", apiResponse);
  throw error;
}

module.exports = { get, post, put };

