var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var enumRides = 'interval endurance strength race-day recovery'.split(' ');
const enumSentiment = 'negative neutral postive'.split(' ');
const enumPerceivedIntensity = 'low moderate high'.split(' ');
var ObjectId = Schema.Types.ObjectId;

var Ride = new Schema({
	title: {
		type: String,
		required: true
	},
	theme: {
		type: String,
		enum: enumRides,
		default: enumRides[0]
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
	createdBy: {
		id: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		name: String
	},
	updated: {
		type: Date,
		default: Date.now,
		required: true
	},
	riderAttendance: [{
		type: ObjectId,
		ref: 'User',
		required: false
	}],
	feedback: [{
		rating: {
			type: Number,
			max: 5,
			min: 1,
			default: 3
		},
		perceivedIntensity: {
			type: String,
			enum: enumPerceivedIntensity,
			default: enumPerceivedIntensity[1]
		},
		sentiment: {
			type: String,
			required: true,
			enum: enumSentiment,
			default: enumSentiment[1]
		},
		favoriteTrack: {
			type: ObjectId, //track ID
			ref: 'Track'
		},
		rider: {
			type: ObjectId,
			ref: 'User'
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
	}]
});

Ride.statics.findByUserAttendance = function(id, fields, callback) {
	var Ride = this;
	return Ride.find({riderAttendance: id}, fields, callback);
};

Ride.pre('save', function(next) {
	if (!this.isModified('updated')) this.updated = new Date;
	next();
});

exports.Ride = Ride;