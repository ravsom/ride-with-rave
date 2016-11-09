/**
 * Created by rs on 09/11/16.
 */

var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema = mongoose.Schema;

var enumAuthType = 'google facebook'.split(' ');
var userGender = 'male female'.split(' ');

var AccessRequestedUser = new Schema({
	userAuthType: {
		type: String,
		enum: enumAuthType
	},
	socialProfileUrl: String,
	profileId: String,
	accessToken: String,
	emails: [String],
	photoUrl: String,
	firstName: {
		type: String,
		required: true,
		trim: true
	},
	lastName: {
		type: String,
		required: false,
		trim: true
	},
	email: {
		type: String,
		required: false,
		trim: true
	},
	approved: {
		type: Boolean,
		default: false
	},
	created: {
		type: Date,
		default: Date.now
	},
	updated: {
		type: Date,
		default: Date.now
	},
	gender: {
		type: String,
		enum: userGender,
		required: false
	},
	occupation: String,
	mappedUser: {
		type: Boolean,
		default: false
	},
	phoneNumber: {
		type: String,
		required: false
	}
});


const callBackCheck = (cb, err, user) => {
	if (err) return cb(err);
	if (!user) return cb(new Error('User is not found'));
	cb(null, user);
};

User.statics.findProfileById = function(id, fields, callback) {
	var User = this;
	return User.findById(id, fields, callBackCheck.bind(this, callback));
};

User.statics.findProfileByName = (name, fields, callback)=> {
	return User.find({displayName: name}, fields, callBackCheck.bind(this, callback));
};

exports.AccessRequestedUser = AccessRequestedUser;