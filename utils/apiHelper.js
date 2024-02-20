require('dotenv').config();
const supertest = require('supertest');
const url = "https://dev.api.tribalcredit.io";
const request = supertest(url);
const log = require('../utils/utilsHelper');
const fs = require('fs');
const path = require('path');

async function postBulkAdjustments(endpoint, filePath, month, year, token = null) {
  let res;
  try {
      let req = request.post(endpoint);
      if (token) {
          req = req.set('Authorization', `Bearer ${token}`);
      }

      req.attach('file', fs.createReadStream(path.resolve(filePath)));
      req.field('effectiveDate', new Date(year, month, 0).toISOString().split('T')[0]);

       res = await req;
      log.logToTxt("POST", endpoint, "\nREQUEST:", filePath);
      log.logToTxt("POST", endpoint, "\nRESPONSE:", res.body);
      return res;

  } catch (error) {
      await handleError(error, res);
  }
}

async function get(endpoint, token = null) {
  let res;

  try {
    let req = request.get(endpoint);
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    res = await req;
    log.logToTxt("GET:",endpoint,"\nRESPONSE:",res.body);
    return res;

  } catch (error) {
    await handleError(error, res);
  }
}

async function post(endpoint, body, token = null) {
  let res;

  try {
    let req = request.post(endpoint).send(body);
    log.logToTxt("POST",endpoint,"\nREQUEST:",body);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    res = await req;
    log.logToTxtData("POST",endpoint,"\nRESPONSE:",res.body);
    log.logToTxt("POST",endpoint,"\nRESPONSE:",res.body);
    return res;

  } catch (error) {
    await handleError(error, res);
  }
}

async function put(endpoint, body, token = null) {
  let res;

  try {
    let req = request.put(endpoint).send(body);
    log.logToTxt("PUT",endpoint,"\nREQUEST:",body);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    res = await req;
    log.logToTxt("PUT",endpoint,"\nRESPONSE:",res.body);
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

module.exports = { get, post, put, postBulkAdjustments };

