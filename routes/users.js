var path = require('path');
var mongodb = require('mongodb');

var safeFields = 'firstName lastName photoUrl admin approved banned role created updated social';

exports.getUsers = function(req, res, next) {
	console.log("Request session: " + JSON.stringify(req.session));
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

exports.getUserByName = function(req, res, next) {
	var fields = safeFields;
	const qName = req.params.name;

	req.db.User.find({firstName: {$regex: new RegExp(qName), $options: 'i'}}, fields, (err, user)=> {
		if (err) return next(err);
		res.status(200).json(user);
	});
};

exports.getMappableUsersLike = function(req, res, next) {
	var fields = safeFields;
	const qName = req.params.name;
	req.db.User.find({
		firstName: {$regex: new RegExp(qName), $options: 'i'},
		mappedUser: false,
		instructor: false
	}, fields, (err, user)=> {
		if (err) res.status(500).json({message: 'unable to search for mappable user like: ' + qName});
		res.status(200).json(user);
	});
};

exports.getMappableUsers = function(req, res, next) {
	var fields = safeFields;

	const qName = req.params.name;

	(qName) ? (
		//Filtered
		req.db.User.find({
			firstName: {$regex: new RegExp(qName), $options: 'i'},
			mappedUser: false,
			instructor: false
		}, fields, {limit: 20}, (err, user)=> {
			if (err) return next(err);
			res.status(200).json(user);
		})
	) : (
		//Non Filtered
		req.db.User.find({
			mappedUser: false,
			instructor: false
		}, fields, {limit: 5}, (err, user)=> {
			if (err) return next(err);
			res.status(200).json(user);
		})
	);
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

function getUnMappedAccessRequestingUsers(req, res) {
	req.db.AccessRequestedUser.find({mappedUser: false}, {}, {limit: 10}, (function(err, obj) {
		if (err) {
			console.log('routes.users> error: ' + err);
			res.status(500).json({message: 'Unable to access \'users\' :' + err.message});
		} else {
			res.status(200).json(obj);
		}
	}));
}

exports.getunapproved = function(req, res) {
	getUnMappedAccessRequestingUsers(req, res);
};

exports.approveuser = function(req, res) {
	const payload = req.body;
	const accessRequestedId = payload.memberId;
	console.log('accessRequestedId: ' + accessRequestedId);

	var mappedMemberId = payload.mappedMemberId;
	console.log('mappedMemberId: ' + mappedMemberId);

	req.db.AccessRequestedUser.findById(accessRequestedId, function(err, aRU) {
		if (err) res.status(500).json({'message': err.message});
		aRU.update({
			$set: {mappedUser: true}
		}, function(err) {
			if (err) {
				res.status(500).json({message: 'unable to update user.' + err.message});
			}
			else {

				req.db.User.findById(mappedMemberId, function(err, doc) {
					if (err) res.status(500).json({message: err.message});
					else {
						console.log('user is ' + JSON.stringify(doc));
						doc.update({
							$set: {
								accessReqUser: aRU._id,
								mappedUser: true,
								approved: true,
								email: aRU.email,
								photoUrl: aRU.photoUrl ? aRU.photoUrl : aRU.social[0].photoUrl,
								firstName: aRU.firstName,
								lastName: aRU.lastName
							}
						}, function(err) {
							if (err) res.status(500).json({message: err.message});
						});
						getUnMappedAccessRequestingUsers(req, res);
					}
				})
			}
		});
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
