'use strict';

var jwt = require('jsonwebtoken');
var database = require('../models/db.js');
var views = '/home/Qburst/Desktop/webchat/docker/views';
var path = require('path');
var clients = {};
var usertokens = {};
var flag = 0;
var api_keys = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

module.exports = function (app, wsServer) {
app.get('/webchat', function (req, res) {

		res.sendFile(path.join(__dirname , '../views','/start.html'));
	});
	app.get('/webchat/signup', function (req, res) {

		res.sendFile(path.join(__dirname , '../views','/signup.html'));
	});

	app.get('/webchat/login', function (req, res) {

		res.sendFile(path.join(__dirname , '../views','/login.html'));
	});

	app.get('/webchat/chat', function (req, res) {
		res.sendFile(path.join(__dirname , '../views','/chat.html'));
	});

	app.post('/webchat/logout', function (req, res) {
		if (!req.body.api_key) {
			res.status(400).json({ 'status': 400, 'error': "Api key is missing" });
			return;
		}
		if (api_keys.indexOf(req.body.api_key) === -1) {
			res.status(400).json({ 'status': 400, 'error': "Invalid Api Key" });
			return;
		}
		
			if(!(req.body.username in usertokens))
				res.status(400).json({ 'status': 400, action: 'logout', error: 'Logged out Error' });
			else if(req.body.username in clients)
			{clients[req.body.username].close();
			res.json({ 'status': 200, action: 'logout', message: 'Logged out Successfully' });
			}
			else{
			res.json({ 'status': 200, action: 'logout', message: 'Logged out Successfully' });
			delete usertokens[req.body.username];
 
			}
		
	});

	app.post('/webchat/signup', function (req, res) {
		if (!req.body.api_key) {
			res.status(400).json({ 'status': 400, 'error': "Api key is missing" });
			return;
		}
		if (api_keys.indexOf(req.body.api_key) === -1) {
			
			res.status(400).json({ 'status': 400, 'error': "Invalid Api Key" });
			return;
		}
		if (!req.body.username || !req.body.password) {
			res.status(400).json({ 'status': 400, 'error': "Please enter username and password" });
		} else {
			var newUser =  {
				username: req.body.username,
				password: req.body.password};
			console.log(newUser)
			database.find({
				username: req.body.username
			}, function (err, result) {
				if (err) {
					res.status(400).json({ 'status': 400, 'error': err });
					return;
				}
				if (result.length != 0) res.status(400).json({ 'status': 400, action: 'signup', 'error': "The given name  exists." });else {
					var newp = new database(newUser);
					newp.save(function (err) {
						if (err) {
							res.status(400).json({ 'status': 400, 'error': err });
							return;
						}
						res.json({ 'status': 200, action: 'signup', message: 'Sign Up Successful' });
					});
				}
			});
		}
	});

	app.post('/webchat/login', function (req, res) {
		if (!req.body.api_key) {
			res.status(400).json({ 'status': 400, 'error': "Api key is missing" });
			return;
		}
		if (!req.body.api_key in api_keys) {
			res.status(400).json({ 'status': 400, 'error': "Invalid Api Key" });
			return;
		}
		if (!req.body.username || !req.body.password) {
			res.status(400).json({ 'status': 400, 'error': "Please enter username and password" });
		} else {
			var user = {
				username: req.body.username,
				password: req.body.password}
				console.log()
			database.find({
				'username': req.body.username,
				'password': req.body.password
			}, function (err, result) {
				if (err) {

					res.status(400).json({ 'status': 400, 'error': err });
					return;
				}
				
				if (result.length == 0) res.status(401).json({ 'status': 401, action: 'login', 'error': "Incorrect username or password" });else {
					var name = req.body.username;

					
					for (var key in clients) {
						if (key == name) {
							if (name in clients)
							{clients[name].state = 'closed';
								delete clients[name];
							}
							delete usertokens[name];
						}
					}

					var token = jwt.sign(user, "ERHGAETRHGQR5G");
					usertokens[name] = token;
					res.json({ 'status': 200, action: 'login', 'message': "Login Successful", 'token': token });
				}
			});
		}
	});



	wsServer.on('request', function (request) {

		var token = request.resourceURL.query.token;
				

		var connection;
		console.log(new Date() + ' Connection from origin ' + request.origin + '.');

		 try{
		var decoded = jwt.verify(token, "ERHGAETRHGQR5G");
		var clientName = decoded.username;
		}catch(e){
			request.reject(403,"Invalid Token Format");
			return;
		}
		
		if (usertokens[clientName] == token) {

			if (clientName in clients) {
				clients[clientName].state = 'closed';
				delete clients[clientName];
				delete usertokens[clientName];
			}
			
			connection = request.accept('', request.origin);
		} else {

			request.reject(403,"Invalid Token");
			return;

		}
		var userName = false;

		clients[clientName] = connection;

		connection.on('message', function (message) {
			if (connection.state == 'closed') {
				connection.close(3010);
			} else {

				if (message.type === 'utf8') {
					try{
					var msg = JSON.parse(message.utf8Data);}
					catch(e){
						connection.sendUTF(JSON.stringify({ type: 'alert', data: "Invalid Syntax" }));
						return;
					}
					userName = msg.to;
					database.find({
						'username': userName
					}, function (err, result) {
						if (err) throw err;
						console.log(result)
						if (result.length == 0) {
							var jsn = JSON.stringify({ type: 'alert', data: "The user doesn't exists" });
							userName = false;
							connection.sendUTF(jsn);
						} else {
							console.log(new Date() + ' Sent Message to ' + userName + ': ' + msg.msg);
							if (msg.msg.length > 2000) {
								var jsn = JSON.stringify({ type: 'alert', data: "The message length exceeded." });
								connection.sendUTF(jsn);
							} else {
								var obj = {
									time: new Date().getTime(),
									text: msg.msg,
									to: userName,
									author: clientName

								};
								var json = JSON.stringify({ type: 'message', data: obj });
								if (userName in clients) {
									for (var key in clients) {
										if (key == userName || key == clientName) clients[key].sendUTF(json);
									}
								} else {
									var jsn = JSON.stringify({ type: 'alert', data: "The user is not available" });
									clients[clientName].sendUTF(jsn);
									userName = false;
								}
							}
						}
					});
				}
			}
		});

		connection.on('close', function (connection) {

			console.log(new Date() + " Peer  disconnected.");
			if (connection !== 3010) {

				delete clients[clientName];
				delete usertokens[clientName];
			}
		});
	});
};