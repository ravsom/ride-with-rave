objectId = require('mongodb').ObjectID;
var Rider = require('../models/rider');

exports.addRider = (req, res, next)=> {
	db = req.db;

	console.log("DB is " + db);
	console.log("name :" + req.body._json);
	return {rider: "Advanced"};
	//Rider.findOrCreate({name:}, {}, (err, rider, created)=> {
	//
	//})

};