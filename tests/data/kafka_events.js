let card_capture_event = {
    "amount":1900,
    "authorizationId":"",
    "cardId":"5cbbb185-8c97-4c5e-9fdd-34707b844303",
    "cardNickName":"my card",
    "cardholder":"",
    "country":"MX",
    "currency":"MXN",
    "customerId":"8350415b-de02-45b0-943f-f3b623395ec2",
    "issuerId":"43867793-43c5-48f4-b32d-7bef1379bc35",
    "lastFourDigits":"3986",
    "ledgerAuthId": "46d57b06-d9f5-4d28-9669-9bda7ce4b053",
    "merchantAmount":111,
    "merchantCurrency":"MXN",
    "merchantInfo":{
        "categoryCode":"3076",
        "country":"MX",
        "id":"1234",
        "name":"Amazon"
    },
    "metadata":{
        "auth_id":1513795,
        "cardholder_present":"Y",
        "international":false,
        "merchant_country":"MX",
        "merchant_description":"Wal-Mart Super Center  LITHONIA       GA",
        "merchant_id":"A100100100",
        "merchant_state":"GA",
        "recurring":"N",
        "terminal_id":"13400050",
        "timestamp":"20210813:063838MST"
    },
    "operationId":"abcd_1234",
    "traceId":"",
    "userId":"12c74b05-9341-4445-b69c-2ab0c803bc8c"           
}

let card_settled_event = {
    "amount":1900,
    "authorizationCode":"abcd_1234",
    "cardID":"5cbbb185-8c97-4c5e-9fdd-34707b844303",
    "currency":"MXN",
    "customerID":"8350415b-de02-45b0-943f-f3b623395ec2",
    "dateTime":"2023-11-15T20:03:20Z",
    "forced":false,
    "fxRate":1,
    "id":"f3c5f0a0-4815-4434-b747-13f49dcc5cf7",
    "lastFourDigits":"3986",
    "merchantCountry":"",
    "merchantCurrency":"",
    "merchantName":"uber",
    "name":"Tribal Card",
    "provider":"Stripe"
    ,
    "providerSettlementDate":"2023-11-15T20:03:20Z",
    "settlementFileID":"2022-12-31",
    "tags":[
        "galileo",
        "atlas"
    ],
    "type":"settled",
    "userID":"12c74b05-9341-4445-b69c-2ab0c803bc8c"
}

module.exports = {
    card_capture_event,
    card_settled_event
}