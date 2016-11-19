const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const models = require('../models');

const auth = function(passport, app, connection) {
	passport.serializeUser(function(user, done) {
		console.log("Serializing user:" + user);
		done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
		console.log('deserializing user : ' + obj);
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
		if (req.isAuthenticated()) {
			req.session.auth = true;

			req.session.userId = req.user._id;
			req.session.user = req.user;
			req.session.admin = req.user.admin;
		}
		if (!req.user.approved) {
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

	const findOrCreateRequestedUser = (done, profile)=> {
		connection.model('AccessRequestedUser', models.AccessRequestedUser, 'accessRequestedUser').findOrCreate({email: profile.email}, {
				email: profile.email,
				lastName: profile.lastName,
				firstName: profile.firstName,
				gender: profile.gender,
				social: [{
					userAuthType: profile.userAuthType,
					profileId: profile.socialProfileId,
					profileUrl: profile.socialProfileUrl,
					accessToken: profile.accessToken,
					emails: [profile.email],
					photoUrl: profile.photoUrl
				}],
			}, function(err, user, created) {
				console.log('existing user: ' + user + ' created: ' + created);
				return user ? done(err, user) : null;
			}
		)
	};

//Google
	passport.use(new GoogleStrategy(googleOptions, function(accessToken, refreshToken, profile, done) {
		console.log("Profile is printed from here: " + profile);
		console.log("Access token: " + accessToken);
		console.log(profile._json);
		connection
			.model('User', models.User, 'users')
			.findOne({
					email: profile._json.emails[0].value
				}, function(err, user) {
					console.log("User not in user table : " + profile);
					const profileObj = {
						displayName: profile.displayName,
						email: profile._json.emails[0].value,
						lastName: profile._json.name.familyName,
						firstName: profile._json.name.givenName,
						userAuthType: 'google',
						socialProfileUrl: profile._json.url,
						accessToken: accessToken,
						socialProfileId: profile._json.id,
						gender: profile._json.gender,
						photoUrl: profile._json.image.url
					};
					return user ? done(err, user) : done(err,
						findOrCreateRequestedUser(done, profileObj));
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
			.findOne({
					email: profile._json.email
				}, function(err, user) {
					console.log("User not in user table : " + profile);
					const profileObj = {
						displayName: profile.displayName,
						email: profile._json.email,
						lastName: lastName,
						firstName: firstName,
						userAuthType: 'facebook',
						accessToken: accessToken,
						socialProfileId: profile.id,
						gender: profile._json.gender,
						photoUrl: profilePhotoUrl
					};
					return user ? done(err, user) : done(err,
						findOrCreateRequestedUser(done, profileObj));
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