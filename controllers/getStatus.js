var config = require('../config');
var request = require('request');

// this returns task information to slack when requested from slack
module.exports = function(req, res, next) {
    // avoid infinite loop
    if (req.body.user_name !== 'slackbot') { // all bots post as slackbot even if the username is different
        if (req.body.command) { // only continue if there is a ticket number
            var options = {
                'uri': config.serviceNow.taskDataUrl + '&sysparm_query=number=' + req.body.text,
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

            var slackResponse = {
                'username': 'ServiceNow',
                'channel': req.body.channel_id,
                'icon_emoji': ':oit:'
            };

            request(options, function(error, response, body) {
                if (error || response.statusCode != 200 || !body.records) {
                    return res.send(500, 'An error occurred.');
                } else if (body.records.length <= 0) {
                    slackResponse.text = req.body.text + ' not found!';
                } else {
                    var ticket = body.records[0];
                    slackResponse.text = '*<' + config.serviceNow.taskLink + ticket.sys_id + '|' + ticket.number + '>*:  ' + ticket.short_description + '\n```State: ' + ticket.state + '\nPriority: ' + ticket.priority + '```';
                }

                // now return the response to slack
                var resOptions = {
                    uri: config.slack.responseUrl,
                    method: 'POST',
                    body: JSON.stringify(slackResponse)
                };

                request(resOptions, function(error, response, body) {
                    if (error || response.statusCode != 200) {
                        return res.status(500).end();
                    }
                    return res.status(200).end();
                });
            });
        } else {
            return res.status(200).json({
                text: 'A ticket number is required!'
            }); // response if not using /sn-task [ticket number]
        }
    } else {
        return res.status(200).end();
    }
};
