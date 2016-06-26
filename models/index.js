var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var roles = 'user staff mentor investor founder'.split(' ');
var userSentiment = 'positive neutral negative'.split(' ');
var userGender = 'male female'.split(' ');
var enumAuthType = 'google facebook'.split(' ');
var findOrCreate = require('mongoose-findorcreate');

var Track = new Schema({
	//
});



var Ride = new Schema({
	title: {
		required: true,
		type: String,
		trim: true,
		// match: /^([[:alpha:][:space:][:punct:]]{1,100})$/
		match: /^([\w ,.!?]{1,100})$/
	},
	text: {
		type: String,
		trim: true,
		max: 2000
	},
	feedback: [{
		text: {
			type: String,
			trim: true,
			max: 2000
		},
		rating: {
			type: Number,
			max: 5,
			min: 1,
			required: true,
			default: 3
		},
		sentiment: {
			type: String,
			enum: userSentiment,
			default: userSentiment[1]
		},
		favoriteTrack: {
			type: Array
		},
		author: {
			id: {
				type: Schema.Types.ObjectId,
				ref: 'User'
			},
			name: String
		}
	}],
	likes: [{
		type: Schema.Types.ObjectId,
		ref: 'User'
	}],
	author: {
		id: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		name: {
			type: String,
			required: true
		}
	},
	rideDate: {
		type: Date,
		default: Date.now,
		required: true
	},
	created: {
		type: Date,
		default: Date.now,
		required: true
	},
	updated: {
		type: Date,
		default: Date.now,
		required: true
	}
});

Ride.pre('save', function(next) {
	if (!this.isModified('updated')) this.updated = new Date;
	next();
});

var User = new Schema({
	userAuthType: {
		type: String,
		enum: enumAuthType
	},
	profileId: String,
	accessToken: String,
	firstName: {
		type: String,
		required: true,
		trim: true
	},
	lastName: {
		type: String,
		required: true,
		trim: true
	},
	displayName: {
		type: String,
		required: true,
		trim: true
	},
	email: {
		type: String,
		required: true,
		trim: true
	},
	role: {
		type: String,
		enum: roles,
		required: true,
		default: roles[0]
	},
	approved: {
		type: Boolean,
		default: false
	},
	banned: {
		type: Boolean,
		default: false
	},
	admin: {
		type: Boolean,
		default: false
	},
	headline: String,
	photoUrl: String,
	created: {
		type: Date,
		default: Date.now
	},
	updated: {
		type: Date,
		default: Date.now
	},
	facebookUrl: String,
	googlePlusUrl: String,
	gender: {
		type: String,
		enum: userGender
	},
	occupation: String
});

User.plugin(findOrCreate);

User.statics.findProfileById = function(id, fields, callback) {
	var User = this;
	var Ride = User.model('Ride');

	return User.findById(id, fields, function(err, user) {
		if (err) return callback(err);
		if (!user) return callback(new Error('User is not found'));

		Ride.find({
			author: {
				id: user._id,
				name: user.displayName
			}
		}, null, {
			sort: {
				'created': -1
			}
		}, function(err, list) {
			if (true) return;
			//Testing out - this is not required for now
			if (err) return callback(err);
			user.posts.own = list || [];
			Ride.find({
				likes: user._id
			}, null, {
				sort: {
					'created': -1
				}
			}, function(err, list) {
				if (err) return callback(err);
				user.rides.likes = list || [];
				Ride.find({
					watches: user._id
				}, null, {
					sort: {
						'created': -1
					}
				}, function(err, list) {
					if (err) return callback(err);
					user.rides.watches = list || [];
					Ride.find({
						'comments.author.id': user._id
					}, null, {
						sort: {
							'created': -1
						}
					}, function(err, list) {
						if (err) return callback(err);
						user.rides.comments = [];
						list.forEach(function(ride, key, arr) {
							ride.comments.forEach(function(comment, key, arr) {
								if (comment.author.id.toString() == user._id.toString())
									user.rides.comments.push(comment);
							});
						});
						callback(null, user);
					});
				});
			});
		});
	});
};

exports.Ride = Ride;
exports.User = User;
