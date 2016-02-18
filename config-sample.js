module.exports = {
    "slack": {
        "incomingTokens": [
            "SLACK_TOKEN"
        ],
        "responseUrl": "https://hooks.slack.com/services/URL_HERE",
        "channels": {
            "channel_name": "12345"
        }
    },
    "serviceNow": {
        "taskDataUrl": "https://it.byu.edu/TASKDATA_URL_HERE",
        "incidentDataUrl": "https://it.byu.edu/INCIDENTDATA_URL_HERE",
        "changeRequestDataUrl": "https://it.byu.edu/REQUEST_URL_HERE",
        "taskLink": "https://it.byu.edu/TASK_URL_HERE",
        "username": "USERNAME",
        "password": "PASSWORD"
    },
    "eventHub": {
        "messageKey": "KEY",
        "url": "https://api.byu.edu/EVENTHUB_URL_HERE",
        "apiKey": "KEY",
        "sharedSecret": "SECRET",
        "subscriptions": [{
            "domain": "edu.byu",
            "entity": "Service Now - Change",
            "event_type": "Emergency Created"
        }, {
            "domain": "edu.byu",
            "entity": "Service Now - Incident",
            "event_type": "P1 Created"
        }],
        "webhook": "http://your.webhook.here",
        "ticketTypes": [
            "RFC", "INC", "RPR", "PRB", "ENG"
        ]
    }
};
