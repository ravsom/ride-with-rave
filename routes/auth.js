const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const models = require('../models');

const auth = function(passport, app, connection) {
	passport.serializeUser(function(user, done) {
		console.log("Serializing user:" + user);
		done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
		done(null, obj);
	});

	var facebookOptions = {
		clientID: process.env.FACEBOOK_CLIENT_ID,
		clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
		callbackURL: 'http://localhost:' + app.get('port') + '/api/auth/facebook/callback',
		profileFields: ['id', 'displayName', 'photos', 'emails', 'gender']
	};

	var googleOptions = {
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: 'http://localhost:' + app.get('port') + '/api/auth/google/callback',
		scope: "openid profile email"
	};

	var authenticateCB = function(req, res) {
		//FIXME Check how user gets populated here -
		console.trace();
		if (req.isAuthenticated()) {
			console.log('Server.js -> authenticateCB -> is authenticated');
			req.session.auth = true;
			req.session.userId = req.user._id;
			req.session.user = req.user;
			req.session.admin = req.user.admin;
		}
		if (req.user.approved) {
			console.log('user not approved.');
			res.redirect('http://localhost:3000/');
		} else {
			console.log('approved user: ' + req.user);
			res.redirect('http://localhost:3000/login');
		}
	};

	app.get('/api/auth/facebook/callback',
		passport.authenticate('facebook', {failureRedirect: 'http://localhost:3000'}), authenticateCB
	);

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
					occupation: profile._json.occupation,
					gender: profile._json.gender,
					userAuthType: userAuthType,
					photoUrl: profile._json.image.url,
					google: {
						photoUrl: profile._json.image.url,
						profileId: profile._json.id,
						accessToken: accessToken,
						googleUrls: profile._json.urls,
						googlePlusUrl: profile._json.url,
					}
				}, function(err, user, created) {
					console.log("Created: " + created);
					console.log("USer : " + user);
					return done(err, user);
				}
			);
	}));

	app.get('/api/auth/google', passport.authenticate('google'));

	app.get('/api/auth/google/callback',
		passport.authenticate('google', {failureRedirect: 'http://localhost:3000'}), authenticateCB);

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
		const profilePhotoUrl = profile._json.picture.data.is_silhouette ? null : profile._json.picture.data.url;
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
					photoUrl: profilePhotoUrl,
					userAuthType: 'facebook',
					facebook: {
						profileId: profile.id,
						photoUrl: profilePhotoUrl,
						accessToken:accessToken
					},
					gender: profile._json.gender
				}, function(err, user, created) {
					console.log('auth.js-> facebook create: ' + created);
					return done(err, user);
				}
			);
	}));


	app.get('/api/auth/facebook',
		passport.authenticate('facebook', {scope: ['email']}),//gender not a valid scope
		function(req, res) {
			// The request will be redirected to facebook for authentication, so this
			// function will not be called.
			console.log("Facebook callback");
		});


};
module.exports = auth;