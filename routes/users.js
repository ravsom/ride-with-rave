var path = require('path');
var objectId = require('mongodb').ObjectID;

var safeFields = 'firstName lastName displayName headline photoUrl admin approved banned role angelUrl twitterUrl facebookUrl linkedinUrl githubUrl created updated';

exports.getUsers = function(req, res, next) {
	if (req.session.auth && req.session.userId) {
		req.db.User.find({}, safeFields, function(err, list) {
			if (err) return next(err);
			res.status(200).json(list);
		});
	} else {
		return next('User is not recognized.')
	}
};
csv = require('express-csv');

exports.getUsersCsv = function(req, res, next) {
	if (req.session.auth && req.session.userId && req.session.admin) {
		req.db.User.find({}).select({email: 1, firstName: 1, lastName: 1}).lean().exec(function(err, list) {
			if (err) return next(err);
			if (!list) return next(new Error('No records'));
			list = list.map(function(user, index) {
				return [user['_id'], user['email'], user['firstName'], user['lastName']]
			});
			res.status(200).csv(list);
		});
	} else {
		return next('User is not recognized.')
	}
};

exports.getUser = function(req, res, next) {
	var fields = safeFields;
	if (req.session.admin) {
		fields = fields + ' email';
	}
	req.db.User.findProfileById(req.params.id, fields, function(err, data) {
		if (err) return next(err);
		res.status(200).json(data);
	})
};

exports.add = function(req, res, next) {
	var user = new req.db.User(req.body);
	user.save(function(err) {
		if (err) {
			next(err);
			return;
		}
		res.json(user);
	});
};

exports.update = function(req, res, next) {
	var obj = req.body;
	obj.updated = new Date();
	delete obj._id;
	var approvedNow = obj.approved && obj.approvedNow;
	delete obj.approvedNow;
	req.db.User.findByIdAndUpdate(req.params.id, {
		$set: obj
	}, {
		new: true
	}, function(err, user) {
		if (err) return next(err);
		if (approvedNow && user.approved) {
			console.log('Approved... sending notification!');
		} else {
			res.status(200).json(user);
		}
	});
};

exports.del = function(req, res, next) {
	req.db.User.findByIdAndRemove(req.params.id, function(err, obj) {
		if (err) next(err);
		res.status(200).json(obj);
	});
};

exports.findOrAddUser = function(req, res, next) {
	req.db.User.findOne({
		_id: data.id
	}, function(err, obj) {
		console.log('adding user Login findOrAddUser');
		if (err) return next(err);
		if (!obj) {
			console.warn('Creating a user', obj, data);
			//req.db.User.create({
			//		profileId: data.id,
			//		//token: req.session.angelListAccessToken,
			//		profile: data,
			//		email: data.email,
			//		firstName: data.name.split(' ')[0],
			//		lastName: data.name.split(' ')[1],
			//		displayName: data.name,
			//		headline: data.bio,
			//		photoUrl: data.image,
			//		facebookUrl: data.facebook_url,
			//		googlePlusUrl: data.url
			//	}, function(err, obj) { //remember the scope of variables!
			//		if (err) return next(err);
			//		console.log('User was created', obj);
			//		req.session.auth = true;
			//		req.session.userId = obj._id;
			//		req.session.user = obj;
			//		req.session.admin = false; //assign regular user role by default
			//		res.redirect('/#application');
			//		// }
			//	}
			//);
		} else { //user is in the database
			req.session.auth = true;
			req.session.userId = obj._id;
			req.session.user = obj;
			req.session.admin = obj.admin; //false; //assing regular user role by default
			if (obj.approved) {
				res.redirect('/#posts');
			} else {
				res.redirect('/#application');
			}
		}
	})
};
