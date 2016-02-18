var crypto = require('crypto');
var request = require('request');
var config = require('../config.js');

// nonce encode and get hmac for the request
function getAuthHeaderNonceHash(callback) {
    var nonceAPI = 'https://ws.byu.edu/authentication/services/rest/v1/hmac/nonce/' + config.eventHub.apiKey;

    //nonce encode using auth service
    request.post(nonceAPI, function(error, response, body) {
        if (error) {
            return callback(error);
        }
        body = JSON.parse(body);
        if (!body.nonceValue) {
            return callback('Problem connecting to authentication server.');
        }
        // get the hmac
        try {
            var hmac = crypto.createHmac('sha512', config.eventHub.sharedSecret).update(body.nonceValue).digest('base64');
            return callback(null, hmac, body.nonceKey);
        } catch ( error ) {
            return callback('An error occurred while generating the hmac: ' + error);
        }
    });
}

// make call to external endpoints
exports.makeRestRequest = function(options, callback) {
    // if there are not options, reject it
    if (typeof options === 'function') {
        return callback("Request options are required!");
    }

    // get the authHeader hash
    getAuthHeaderNonceHash(function(error, hmacHash, nonceKey) {
        if (error) {
            return callback(error);
        } else if (!hmacHash) {
            return callback('Problem connecting to authentication web service.');
        }

        options.headers = {
            'Authorization': 'Nonce-Encoded-API-Key ' + config.eventHub.apiKey + ',' + nonceKey + ',' + hmacHash,
            'Accept': 'application/json'
        };

        // make request to EventHub
        request(options, function(error, response, body) {
            if (error) {
                return callback(error);
            }

            return callback(null, body);
        });
    });
};
