var config = require('../config');
var crypto = require('crypto');

module.exports = {
    // Verify requests for ticket info are from Slack
    isValidSlackToken: function(req, res, next) {
        if (config.slack.incomingTokens.indexOf(req.body.token) < 0) {
            return res.status(403).send("You're not authorized to access this app!");
        }
        next();
    },

    // Verify messages are actually coming from Event Hub
    isValidEventHubMessage: function(req, res, next) {
        var buffer = [];
        req.on('data', function(chunk) {
            buffer.push(chunk);
        }).on('end', function() {
            var bufferString = buffer.join("");
            var calculatedHmac = crypto.createHmac('md5', config.eventHub.messageKey).update(bufferString).digest('hex');
            req.body = JSON.parse(bufferString);
            if (req.header('X-Byu-Eventhub-Hmac-Md5') !== calculatedHmac) {
                return res.send(403, "You're not authorized to access this app!");
            }
            next();
        });

        next();
    }
};
