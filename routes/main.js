var bcrypt = require('bcryptjs');

exports.checkAdmin = function(request, response, next) {
	if (request.session && request.session.auth && request.session.userId && request.session.admin) {
		console.info('Access ADMIN: ' + request.session.userId);
		return next();
	} else {
		next('User is not an administrator.');
	}
};

exports.checkUser = function(req, res, next) {
	console.trace();
	if (req.session && req.session.auth && req.session.userId && (req.session.user.approved || req.session.admin)) {
		console.log('Access USER: ' + req.session.userId);
		next();
	} else {
		if(!req.session.user.approved) {
			res.status(401).json({message:"User Unapproved."});
		}else {
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