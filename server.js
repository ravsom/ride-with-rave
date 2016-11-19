var express = require('express'),
	http = require('http'),
	util = require('util'),
	path = require('path'),
	oauth = require('oauth'),
	fs = require('fs'),
	https = require('https'),
	querystring = require('querystring');

var env = require('node-env-file');
env(__dirname + '/.env');

var favicon = require('serve-favicon'),
	logger = require('morgan'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser'),
	session = require('express-session');


var c = require(path.join(__dirname, 'lib', 'colors'));
require(path.join(__dirname, 'lib', 'env-vars'));

var passport = require('passport');


var app = express();

app.set('port', process.env.PORT || 3333);
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(session({
	secret: process.env.SESSION_SECRET,
	key: 'sid',
	cookie: {
		secret: true,
		expires: false
	},
	resave: true,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));


function logErrors(err, req, res, next) {
	if (typeof err === 'string')
		err = new Error(err);
	console.error('logErrors', err.toString());
	next(err);
}

function clientErrorHandler(err, req, res, next) {
	if (req.xhr) {
		console.error('clientErrors response');
		res.status(500).json({error: err.toString()});
	} else {
		next(err);
	}
}

function errorHandler(err, req, res, next) {
	console.error('lastErrors response:' + err.toString());
	res.status(500).json({error: err});
}

var dbUrl = process.env.MONGOHQ_URL || 'mongodb://@127.0.0.1:27017/spintracker';
var mongoose = require('mongoose');
var connection = mongoose.createConnection(dbUrl);
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', function() {
	console.info('Connected to database')
});

var models = require('./models');
var db = (req, res, next) => {
	req.db = {
		User: connection.model('User', models.User, 'users'),
		AccessRequestedUser: connection.model('AccessRequestedUser', models.AccessRequestedUser, 'accessRequestedUser'),
		Ride: connection.model('Ride', models.Ride, 'rides')
	};
	return next();
};

var routes = require('./routes');

require('./routes/auth')(passport, app, connection);

var checkUser = routes.main.checkUser;
var checkAdmin = routes.main.checkAdmin;
var checkApplicant = routes.main.checkApplicant;


//MAIN
app.get('/api/profile', checkUser, db, routes.main.profile);
app.delete('/api/profile', checkUser, db, routes.main.delProfile);
app.post('/api/logout', routes.main.logout);

//RIDES
app.get('/api/rides', checkUser, db, routes.rides.getRides);
app.post('/api/rides', checkUser, db, routes.rides.add);
app.get('/api/rides/:id', checkUser, db, routes.rides.getRide);
app.put('/api/rides/:id', checkUser, db, routes.rides.updateRide);
app.delete('/api/rides/:id', checkUser, db, routes.rides.del);
app.get('/api/rides-attended', checkUser, db, routes.rides.attended);

//User ride feedback
// app.post('/api/feedback/:id', checkUser, db, routes.rides.feedback);

//USERS
app.get('/api/users', checkUser, db, routes.users.getUsers);
app.get('/api/users/:id', checkUser, db, routes.users.getUser);
app.post('/api/users', checkAdmin, db, routes.users.add);
app.put('/api/users/:id', checkAdmin, db, routes.users.update);
app.delete('/api/users/:id', checkAdmin, db, routes.users.del);
app.get('/api/users.csv', checkAdmin, db, routes.users.getUsersCsv);

app.get('/api/unapprovedUsers', checkAdmin, db, routes.users.getunapproved);
app.post('/api/approveuser', checkAdmin, db, routes.users.approveuser);
app.get('/api/userByName/:name', db, checkUser, routes.users.getUserByName);
app.get('/api/mappableusers', db, checkAdmin, routes.users.getMappableUsers);
app.get('/api/mappableuserslike/:name', db, checkAdmin, routes.users.getMappableUsersLike);
//APPLICATION
app.post('/api/application', checkAdmin, db, routes.application.add);
app.put('/api/application', checkApplicant, db, routes.application.update);
app.get('/api/application', checkApplicant, db, routes.application.get);

app.get('*', function(req, res) {
	res.status(404).send();
});

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);


// var ops = {
// key: fs.readFileSync('host.key'),
// cert: fs.readFileSync('server.crt') ,
// passphrase: ''
// };
// console.log (ops)
if (require.main === module) {
	var server = http.createServer(app);
	var io = require('socket.io')(server);
	io.on('connection', function(socket) {
		console.log('a user connected');
		socket.on('chat message', function(msg) {
			console.log('message: ' + msg);
		});
		socket.on('disconnect', function() {
			console.log('user disconnected');
		});
	});
	server.listen(app.get('port'), function() {
		console.info(c.blue + 'Express server listening on port ' + app.get('port') + c.reset);
	});
} else {
	console.info(c.blue + 'Running app as a module' + c.reset);
	exports.app = app;
}
