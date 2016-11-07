var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema = mongoose.Schema;

var enumAuthType = 'google facebook'.split(' ');
var userGender = 'male female'.split(' ');

var User = new Schema({
	userAuthType: {
		type: String,
		enum: enumAuthType
	},
	facebook: {
		profileId: String,
		accessToken: String,
		photoUrl: String,
		facebookUrl: String,
	},
	google: {
		profileId: String,
		accessToken: String,
		photoUrl: String,
		googlePlusUrl: String,
		emails: [String]
	},
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
	banned: {
		type: Boolean,
		default: false
	},
	admin: {
		type: Boolean,
		default: false
	},
	instructor: {
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

User.plugin(findOrCreate);
exports.User = User;