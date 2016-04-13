var ehUtils = require("../utils/eventHubRequestUtils");
var config = require("../config.js");

module.exports = function() { // Oh, "promises"
    acknowledge(function() { // Acknowledge all messages in the queue on startup
        setWebhook(function() {
            getSubscriptions(function(data) {
                removeSubscriptions(data, function() {
                    setSubscriptions(function() {
                        getSubscriptions(function() {
                            console.log("--- Slackbot Listening ---");
                        });
                    });
                });
            });
        });
    });
};

function acknowledge(callback) {
    var options = {
        uri: config.eventHub.url + '/events',
        method: 'GET',
        json: true
    };

    ehUtils.makeRestRequest(options, function(error, data) {
        if (data) {
            console.log("ACKNOWLEDGE LOOP", error, data);
        } else {
            console.log("NO EVENTS IN QUEUE");
        }

        if (error) {
            console.log(error);
        } else if (data && data.event) {
            var options = {
                uri: config.eventHub.url + '/events/' + data.event.event_header.event_id,
                method: 'PUT',
                json: true
            };

            console.log("CALLED ACKNOWLEDGE URL", options.uri);

            ehUtils.makeRestRequest(options, function(error, data) {
                console.log("ACKNOWLEDGED", error, data);

                if (error) {
                    console.log(error);
                }

                console.log("LOOPING THROUGH QUEUE");
                acknowledge(callback);
            });
        } else if (callback) {
            console.log("FINISHED CLEARING QUEUE");

            callback();
        }
    });
}

function setWebhook(callback) {
    getWebhook(function(data) {
        if (data) {
            console.log("SETTING WEBHOOK TO " + config.eventHub.webhook);

            updateWebhook(callback);
        } else {
            var options = {
                uri: config.eventHub.url + "/webhooks",
                method: "POST",
                json: true,
                body: {
                    "webhook": {
                        "endpoint": config.eventHub.webhook,
                        "push_option": "Push Message",
                        "security_option": "HMAC"
                    }
                }
            };

            ehUtils.makeRestRequest(options, function(error, data) {
                console.log("WEBHOOK SET", error, data);

                if (error) {
                    console.log(error);
                }

                if (callback) {
                    callback();
                }
            });
        }
    });
}

function getWebhook(callback) {
    console.log("GETTING WEBHOOK");

    // Get current Event Hub webhook
    var options = {
        uri: config.eventHub.url + "/webhooks",
        method: "GET",
        json: true
    };

    ehUtils.makeRestRequest(options, function(error, data) {
        if (error) {
            console.log(error);
        }

        if (callback) {
            callback(data);
        }
    });
}

function updateWebhook(callback) {
    var options = {
        uri: config.eventHub.url + '/webhooks',
        method: 'PUT',
        json: true,
        body: {
            'webhook': {
                "endpoint": config.eventHub.webhook,
                "push_option": "Push Message",
                "security_option": "HMAC",
                "content_type": "application/json"
            }
        }
    };

    ehUtils.makeRestRequest(options, function(error, data) {
        console.log("WEBHOOK SET", error, data);

        if (error) {
            console.log(error);
        }

        if (callback) {
            callback();
        }
    });
}

function getSubscriptions(callback) {
    // Get all current Event Hub subscriptions
    var options = {
        uri: config.eventHub.url + "/subscriptions",
        method: "GET",
        json: true
    };

    ehUtils.makeRestRequest(options, function(error, data) {
        console.log("GETTING SUBSCRIPTIONS", error, data);

        if (error) {
            console.log(error);
        }

        if (callback) {
            callback(data);
        }
    });
}

function setSubscriptions(callback) {
    // Subscribe to events specified in the config file
    calls = 0;
    for (var i = 0; i < config.eventHub.subscriptions.length; i++) {
        var options = {
            uri: config.eventHub.url + "/subscriptions",
            method: "POST",
            json: true,
            body: {
                "subscription": {
                    "domain": config.eventHub.subscriptions[i].domain,
                    "entity": config.eventHub.subscriptions[i].entity,
                    "event_type": config.eventHub.subscriptions[i].event_type
                }
            }
        };

        calls++;
        ehUtils.makeRestRequest(options, function(error, data) {
            console.log("SETTING SUBSCRIPTION", error, data);

            if (error) {
                console.log(error);
            }

            calls--;
            if (calls === 0) { // So ghetto but I don't care anymore
                if (callback) {
                    callback();
                }
            }
        });
    }
}

//This is important. At times other individuals make subscriptions to the eventhub with your key within a dev environement and forget about it. Make sure to remove all other subscriptions
function removeSubscriptions(data, callback) {
    // Remove all current subscriptions
    calls = 0;
    if (data && data.subscription && data.subscription.length > 0) {
        for (var i = 0; i < data.subscription.length; i++) {
            calls++;
            var options = {
                uri: config.eventHub.url + "/subscriptions/" + data.subscription[i].domain + "/" + data.subscription[i].entity + "/" + data.subscription[i].event_type,
                method: "DELETE",
            };

            ehUtils.makeRestRequest(options, function(error, data) {
                console.log("REMOVING SUBSCRIPTIONS", error, data);

                if (error) {
                    console.log(error);
                }

                calls--;
                if (calls === 0) { // So ghetto but I don't care anymore
                    if (callback) {
                        callback();
                    }
                }
            });
        }
    } else {
        if (callback) {
            callback();
        }
    }
}
