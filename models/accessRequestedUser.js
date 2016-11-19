/**
 * Created by rs on 09/11/16.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var findOrCreate = require('mongoose-findorcreate');

var enumAuthType = 'google facebook strava fitbit'.split(' ');
var userGender = 'male female'.split(' ');

var AccessRequestedUser = new Schema({
	userAuthType: {
		type: String,
		enum: enumAuthType
	},
	social: [
		{
			userAuthType: {
				type: String,
				enum: enumAuthType
			},
			profileUrl: String,
			profileId: String,
			accessToken: String,
			photoUrl: String,
			emails: [String]
		}
	],
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

AccessRequestedUser.statics.findProfileById = function(id, fields, callback) {
	var AccessRequestedUser = this;
	return AccessRequestedUser.findById(id, fields, callBackCheck.bind(this, callback));
};

AccessRequestedUser.statics.findProfileByName = (name, fields, callback)=> {
	return AccessRequestedUser.find({displayName: name}, fields, callBackCheck.bind(this, callback));
};

AccessRequestedUser.plugin(findOrCreate);

exports.AccessRequestedUser = AccessRequestedUser;