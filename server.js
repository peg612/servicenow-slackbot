var config = require('./config');
var express = require('express');
var bodyParser = require('body-parser');
var getStatus = require('./controllers/getStatus');
var provideLink = require('./controllers/provideLink');
var postAlert = require('./controllers/postAlert');
var auth = require('./security/authorization');
var init = require('./controllers/init');
var health = require('./controllers/health');

var app = express();

var port = process.env.PORT || 3000;

var parseBody = bodyParser();

// routes
app.get('/health', health); // get health of bot
app.post('/getStatus', parseBody, auth.isValidSlackToken, getStatus); // get ticket info
app.post('/provideLink', parseBody, auth.isValidSlackToken, provideLink); //provide a link to any mentioned incidents
app.post('/postAlert', parseBody, auth.isValidEventHubMessage, postAlert); //post P1 alert from Event Hub event

// error handler
app.use(function(err, req, res, next) {
    res.status(400).send("There was an error: /n" + err.message);
});

app.listen(port, function() {
    console.log('--- Starting ServiceNow Slack Bot ---');
});

init(); // Set the Event Hub webhook and subscribe to events according to the config file
