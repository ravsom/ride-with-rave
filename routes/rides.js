objectId = require('mongodb').ObjectID;

var LIMIT = 10;
var SKIP = 0;

exports.add = function(req, res, next) {
	if (req.body) {
		req.db.Ride.create({
			title: req.body.title,
			text: req.body.text || null,
			url: req.body.url || null,
			author: {
				id: req.session.user._id,
				name: req.session.user.displayName
			}
		}, function(err, docs) {
			if (err) {
				console.error(err);
				next(err);
			} else {
				res.status(200).json(docs);
			}

		});
	} else {
		next(new Error('No data'));
	}
};

exports.getRides = function(req, res, next) {
	var limit = req.query.limit || LIMIT;
	var skip = req.query.skip || SKIP;
	req.db.Ride.find({}, null, {
		limit: limit,
		skip: skip,
		sort: {
			'_id': -1
		}
	}, function(err, docs) {
		if (!docs) return next('There are not rides.');
		var rides = [];
		docs.forEach(function(doc, i, list) {
			var item = doc.toObject();
			if (req.session.user.admin) {
				item.admin = true;
			} else {
				item.admin = false;
			}
			if (doc.author.id == req.session.userId) {
				item.own = true;
			} else {
				item.own = false;
			}
			if (doc.likes && doc.likes.indexOf(req.session.user._id) > -1) {
				item.like = true;
			} else {
				item.like = false;
			}
			if (doc.watches && doc.watches.indexOf(req.session.user._id) > -1) {
				item.watch = true;
			} else {
				item.watch = false;
			}
			rides.push(item);
		});
		var body = {};
		body.limit = limit;
		body.skip = skip;
		body.rides = rides;
		req.db.Ride.count({}, function(err, total) {
			if (err) return next(err);
			body.total = total;
			res.status(200).json(body);
		});
	});
};


exports.getRide = function(req, res, next) {

	if (req.params.id) {
		req.db.Ride.findById(req.params.id, {
			title: true,
			text: true,
			url: true,
			author: true,
			comments: true,
			watches: true,
			likes: true
		}, function(err, obj) {
			if (err) return next(err);
			if (!obj) {
				next(new Error('Nothing is found.'));
			} else {
				res.status(200).json(obj);
			}
		});
	} else {
		next(new Error('No Ride id'));
	}
};

exports.del = function(req, res, next) {
	req.db.Ride.findById(req.params.id, function(err, obj) {
		if (err) return next(err);
		if (req.session.admin || req.session.userId === obj.author.id) {
			obj.remove();
			res.status(200).json(obj);
		} else {
			next(new Error('User is not authorized to delete Ride.'));
		}
	})
};

function likeRide(req, res, next) {
	req.db.Ride.findByIdAndUpdate(req.body._id, {
		$push: {
			likes: req.session.userId
		}
	}, {}, function(err, obj) {
		if (err) {
			next(err);
		} else {
			res.status(200).json(obj);
		}
	});
};

function watchRide(req, res, next) {
	req.db.Ride.findByIdAndUpdate(req.body._id, {
		$push: {
			watches: req.session.userId
		}
	}, {}, function(err, obj) {
		if (err) return next(err);
		else {
			res.status(200).json(obj);
		}
	});
}

exports.updateRide = function(req, res, next) {
	var anyAction = false;
	if (req.body._id && req.params.id) {
		if (req.body && req.body.action == 'like') {
			anyAction = true;
			likeRide(req, res);
		} else if (req.body && req.body.action == 'watch') {
			anyAction = true;
			watchRide(req, res);
		} else if (req.body && req.body.action == 'comment' && req.body.comment && req.params.id) {
			anyAction = true;
			req.db.Ride.findByIdAndUpdate(req.params.id, {
				$push: {
					comments: {
						author: {
							id: req.session.userId,
							name: req.session.user.displayName
						},
						text: req.body.comment
					}
				}
			}, {
				safe: true,
				new: true
			}, function(err, obj) {
				if (err) throw err;
				res.status(200).json(obj);
			});
		} else if (req.session.auth && req.session.userId && req.body && req.body.action != 'comment' &&
			req.body.action != 'watch' && req.body != 'like' &&
			req.params.id && (req.body.author.id == req.session.user._id || req.session.user.admin)) {
			req.db.Ride.findById(req.params.id, function(err, doc) {
				if (err) next(err);
				doc.title = req.body.title;
				doc.text = req.body.text || null;
				doc.url = req.body.url || null;
				doc.save(function(e, d) {
					if (e) return next(e);
					res.status(200).json(d);
				});
			})
		} else {
			if (!anyAction) next(new Error('Something went wrong.'));
		}

	} else {
		next(new Error('No ride ID.'));
	}
};