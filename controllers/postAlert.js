var config = require('../config');
var request = require('request');
var async = require('async');
var ehUtils = require('../utils/eventHubRequestUtils');

// Post messages to Slack that come from the Event Hub
module.exports = function(req, res, next) {
    console.log("ALERT RECEIVED", req);

    var eventType = req.body.event.event_header.event_type;
    var eventId = req.body.event.event_header.event_id;
    var sysId = req.body.event.event_body.sys_id;


    console.log("START OF WATERFALL");

    // asynchronously make the next couple of calls
    async.waterfall([
        // get ticket info from ServiceNow
        function(callback) {
            var options = {
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
            if (eventType == "P1 Created") {
                console.log("P1 Created");

                options.uri = config.serviceNow.incidentDataUrl + '&sysparm_query=sys_id=' + sysId;
            } else if (eventType == "Emergency Created") {
                options.uri = config.serviceNow.changeRequestDataUrl + '&sysparm_query=sys_id=' + sysId;
            }
            // make the request to ServiceNow
            request(options, function(error, response, body) {
                if (error || response.statusCode != 200 || !body.records || body.records.length <= 0) {
                    return callback({
                        status: 400,
                        message: "An error occurred while retrieving ticket info from Service Now."
                    });
                } else if (body.records[0].u_symptom_category === "") {
                    return callback({
                        status: 200,
                        message: "No need to submit to Slack: User created ticket."
                    });
                }
                callback(null, body.records[0]); // pass ticket to next function
            });
        },
        // send the P1 ticket info to Slack
        function(ticket, callback) {
            var slackResponse = {};
            if (eventType == "P1 Created") {
                console.log("P1 Created - Sending to Slack");

                slackResponse.channel = config.slack.channels['oit-notify'];
                slackResponse.text = '*P1 Incident Created*:  ' + ticket.short_description + '\n```Number: ' + '<' + config.serviceNow.taskLink + ticket.sys_id + '|' + ticket.number + '>\nService: ' + ticket.u_service + '```';
            } else if (eventType == "Emergency Created") {
                slackResponse.channel = config.slack.channels['cab'];
                slackResponse.text = '*Emergency RFC Created*:  ' + ticket.short_description + '\n```Number: ' + '<' + config.serviceNow.taskLink + ticket.sys_id + '|' + ticket.number + '>\nState: ' + ticket.state + '\nPriority: ' + ticket.priority + '```';
            }
            var options = {
                uri: config.slack.responseUrl,
                method: 'POST',
                body: JSON.stringify(slackResponse)
            };

            request(options, function(error, response, body) {
                console.log("SLACK RESPONSE", error, response, body);

                if (error || response.statusCode != 200) {
                    return callback({
                        status: 400,
                        message: "Unable to post message to Slack."
                    });
                } else if (body === "ok") {
                    return callback(null, {
                        status: 200,
                        message: 'Success'
                    });
                }
            });
        }
    ],
        // send a return message to eventHub to confirm that we received the event
        function(error, data) {
            // only send the confirm message if successfully posted to slack
            if ((error && error.status === 200) || (data && data.status === 200)) {
                var options = {
                    uri: config.eventHub.url + '/events/' + eventId,
                    method: 'PUT',
                    'timeout': 1500,
                    json: true
                };
                ehUtils.makeRestRequest(options, function(error, data) {
                    return res.send(200).end();
                });
            }
        });
};
