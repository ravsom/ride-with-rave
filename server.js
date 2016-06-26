var express = require('express'),
	routes = require('./routes'),
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

var passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy,
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

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
	console.error('lastErrors response');
	res.status(500).send(err.toString());
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
		Ride: connection.model('Ride', models.Ride, 'rides'),
		Rider: connection.model('Rider', models.Rider, 'riders')
	};
	return next();
};

var checkUser = routes.main.checkUser;
var checkAdmin = routes.main.checkAdmin;
var checkApplicant = routes.main.checkApplicant;

passport.serializeUser(function(user, done) {
	console.log("Serializing user:" + user);
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	console.log("De - Serializing user:" + obj);
	done(null, obj);
});


var facebookOptions = {
	clientID: process.env.FACEBOOK_CLIENT_ID,
	clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
	callbackURL: 'http://localhost:' + app.get('port') + '/auth/facebook/callback',
	profileFields: ['id', 'displayName', 'photos', 'emails', 'gender']
};

var googleOptions = {
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: 'http://localhost:' + app.get('port') + '/auth/google/callback',
	scope: "openid profile email"
};

var authenticateCB = function(req, res) {
	console.log("Authenticating call back.");
	if (req.isAuthenticated()) {
		req.session.auth = true;
		req.session.userId = req.user._id;
		req.session.user = req.user;
		req.session.admin = req.user.admin;
	}
	if (req.user.approved) {
		res.json(req.user);
	} else {
		res.json({'message': 'not approved'});
	}
};

//Facebook
passport.use(new FacebookStrategy(facebookOptions, function(accessToken, refreshToken, profile, done) {
	console.log("Profile is printed from here: " + profile);
	console.log("Access token: " + accessToken);

	console.log(profile._json);
	if (!profile._json.name) return done(new Error('Can\'t find name in facebook'));
	var firstName = profile._json.name,
		lastName = '';
	var spaceIndex = profile._json.name.indexOf(' ');

	if (spaceIndex > -1) {
		firstName = profile._json.name.substr(0, spaceIndex);
		lastName = profile._json.name.substr(spaceIndex);
	} else {
		return done(new Error('Can\'t find names to fill the facebook'))
	}
	connection
		.model('User', models.User, 'users')
		.findOrCreate({
				email: profile._json.email
			}, {
				profileId: profile.id,
				displayName: profile.displayName,
				email: profile._json.email,
				lastName: lastName,
				firstName: firstName,
				photoUrl: profile._json.avatar_url,
				userAuthType: 'facebook',
				gender: profile._json.gender
			}, function(err, user, created) {
				return done(err, user);
			}
		);
}));


app.get('/auth/facebook',
	passport.authenticate('facebook', {scope: ['email']}),
	function(req, res) {
		// The request will be redirected to GitHub for authentication, so this
		// function will not be called.
	});

app.get('/auth/facebook/callback',
	passport.authenticate('facebook', {failureRedirect: '/#login'}),
	authenticateCB);

//Google
passport.use(new GoogleStrategy(googleOptions, function(accessToken, refreshToken, profile, done) {
	console.log("Profile is printed from here: " + profile);
	console.log("Access token: " + accessToken);

	console.log(profile._json);
	var firstName = profile._json.name.givenName,
		lastName = profile._json.name.familyName;
	var userAuthType = 'google';
	connection
		.model('User', models.User, 'users')
		.findOrCreate({
				email: profile._json.emails[0].value
			}, {
				displayName: profile.displayName,
				email: profile._json.emails[0].value,
				lastName: lastName,
				firstName: firstName,
				profileId: profile._json.id,
				accessToken: accessToken,
				googleUrls: profile._json.urls,
				photoUrl: profile._json.image.url,
				googlePlusUrl: profile._json.url,
				occupation: profile._json.occupation,
				gender: profile._json.gender,
				userAuthType: userAuthType
			}, function(err, user, created) {
				console.log("Created: " + created);
				console.log("USer : " + user);
				return done(err, user);
			}
		);
}));

app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/callback',
	passport.authenticate('google', {failureRedirect: '/#login'}),
	authenticateCB);


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

//User ride feedback

//USERS
app.get('/api/users', checkUser, db, routes.users.getUsers);
app.get('/api/users/:id', checkUser, db, routes.users.getUser);
app.post('/api/users', checkAdmin, db, routes.users.add);
app.put('/api/users/:id', checkAdmin, db, routes.users.update);
app.delete('/api/users/:id', checkAdmin, db, routes.users.del);
app.get('/api/users.csv', checkAdmin, db, routes.users.getUsersCsv);

//RIDERS
app.post('/api/rider', checkAdmin, db, routes.riders.addRider);

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
