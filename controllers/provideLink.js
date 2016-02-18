var config = require('../config'),
    request = require('request'),
    async = require('async');

// create the functions that Async uses when calling ServiceNow to get ticket data
function createAsyncFunction(options) {
    return function(callback) {
        request(options, function(error, response, body) {
            // if there is an error or the ticket is not found, do nothing
            if (error || response.statusCode != 200 || !body.records || body.records.length <= 0) {
                callback(null, false);
            }
            // pass the ticket info to the callback if it was found successfully
            else {
                var ticket = body.records[0];
                ticket.ticketUrl = 'https://it.byu.edu/nav_to.do?uri=task.do?sys_id=' + ticket.sys_id;
                callback(null, ticket);
            }
        });
    };
}

// this returns task information to slack when requested from slack
module.exports = function(req, res, next) {
    // prevent an infinite loop
    if (req.body.user_name !== 'slackbot') {
        //regex match any Incidents, RFCs, or RPRs
        var text = req.body.text;

        var regex = new RegExp("((" + config.eventHub.ticketTypes.join("|") + ")\\d+)", "gi");
        var matches = text.match(regex);

        // if there were no matches, simply return a 200 to Slack
        if (matches === null) {
            return res.send(200).end();
        }

        // create the service now calls and store them in an array
        var serviceNowCalls = [];

        for (var i = 0; i < matches.length; i++) {
            var options = {
                'uri': config.serviceNow.taskDataUrl + '&sysparm_query=number=' + matches[i],
                'headers': {
                    'accept': 'application/json',
                    'Content-Type': 'text/plain'
                },
                'method': 'GET',
                'auth': {
                    'user': config.serviceNow.username,
                    'pass': config.serviceNow.password
                },
                'timeout': 15000,
                json: true
            };
            // array to hold calls to ServiceNow
            serviceNowCalls[i] = createAsyncFunction(options);
        }

        // make the requests to service now to get ticket info
        async.parallel(serviceNowCalls, function(error, results) {
            var slackResponse = {
                'channel': req.body.channel_id,
                'text': ""
            };

            // loop through the tickets to create the response to post in slack
            for (var i = 0; i < results.length; i++) {
                if (results[i]) {
                    slackResponse.text = slackResponse.text + '*<' + config.serviceNow.taskLink + results[i].sys_id + '|' + results[i].number + '>*:  ' + results[i].short_description + '\n```State: ' + results[i].state + '\nPriority: ' + results[i].priority + '```\n';
                }
            }

            // if incidents or RFCs were found post data to slack
            if (slackResponse.text.length > 0) {
                var options = {
                    uri: config.slack.responseUrl,
                    method: 'POST',
                    body: JSON.stringify(slackResponse)
                };
                // send data to slack
                request(options, function(error, response, body) {
                    if (error || response.statusCode != 200) {
                        return res.status(500).end();
                    }
                    return res.status(200).end();
                });
            }
            // if no incidents or RFCs were found just tell slack we got the message but don't post anything
            else {
                return res.send(200).end();
            }
        });
    }
};
