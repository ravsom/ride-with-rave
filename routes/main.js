var bcrypt = require('bcryptjs');

exports.checkAdmin = function(request, response, next) {
	console.log('main req session: ' + JSON.stringify(request.session));
	console.log('main req session auth : ' + request.session.auth);
	console.log('main req session user id: ' + request.session.userId);
	console.log('main req session user approved: ' + request.session.user.admin);

	if (request.session && request.session.auth && request.session.userId && request.session.admin) {
		console.log('Access ADMIN: ' + request.session.userId);
		return next();
	} else {
		return response.status(401).json({error: 'User is not an administrator.'});
	}
};

exports.checkUser = function(req, res, next) {
	console.log('main req session: ' + JSON.stringify(req.session));
	console.log('main req session auth : ' + req.session.auth);
	console.log('main req session user id: ' + req.session.userId);
	console.log('main req session user approved: ' + req.session.user.approved);

	if (req.session && req.session.auth && req.session.userId && (req.session.user.approved || req.session.admin)) {
		console.log('Access USER: ' + req.session.userId);
		return next();
	} else {
		if (!req.session.user.approved) {
			res.status(401).json({message: "User Unapproved."});
		} else {
			return next(new Error('User is not logged in.', 401));
		}
	}
};

exports.checkApplicant = function(req, res, next) {
	console.trace();
	if (req.session && req.session.auth && req.session.userId && (!req.session.user.approved || req.session.admin)) {
		console.info('Access USER: ' + req.session.userId);
		return next();
	} else {
		next(new Error('User is not logged in.', 401));
	}
};

exports.logout = function(req, res) {
	req.session.destroy(function(error) {
		if (!error) {
			res.json({
				status: 'success',
				msg: 'Logged out'
			});
		}
	});
};

exports.profile = function(req, res, next) {
	console.log("User id:" + req.session.userId);
	var fields = 'firstName lastName displayName' +
		' headline photoUrl admin approved banned' +
		' role angelUrl twitterUrl facebookUrl linkedinUrl githubUrl';
	req.db.User.findProfileById(req.session.userId, fields, function(err, user) {
		console.log('err', err);
		if (err) return next(err);
		res.status(200).json(user);
	});
};

exports.delProfile = function(req, res, next) {
	console.log('del profile');
	console.log(req.session.userId);
	req.db.User.findByIdAndRemove(req.session.user._id, {}, function(err, obj) {
		if (err) next(err);
		req.session.destroy(function(error) {
			if (err) {
				next(err)
			}
		});
		res.status(200).json(obj);
	});
};