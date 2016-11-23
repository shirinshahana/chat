'use strict';

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var WebSocketServer = require('websocket').server;
var routes = require('./routes/routes.js');

var app = express();

app.use( '/views',express.static('views'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

var server = http.createServer(app);

var wsServer = new WebSocketServer({
    httpServer: server
});

routes(app, wsServer);

server.listen(8006, function () {
    console.log("server is running");
});