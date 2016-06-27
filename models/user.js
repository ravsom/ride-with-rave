var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema = mongoose.Schema;

var enumAuthType = 'google facebook'.split(' ');
var userGender = 'male female'.split(' ');
var roles = 'user staff mentor investor founder'.split(' ');

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


User.statics.findProfileById = function(id, fields, callback) {
	var User = this;

	return User.findById(id, fields, function(err, user) {
		if (err) return callback(err);
		if (!user) return callback(new Error('User is not found'));
		callback(null, user);
	});
};

User.plugin(findOrCreate);
exports.User = User;