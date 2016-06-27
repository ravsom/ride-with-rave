var userSentiment = 'positive neutral negative'.split(' ');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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

exports.Ride = Ride;