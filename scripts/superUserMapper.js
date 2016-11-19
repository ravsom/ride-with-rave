/**
 * Created by rs on 19/11/16.
 */

const userId = '5830508e12d8cbcd833450d9';
const accessRequestedUserId = "5830074cf561b59195addef1";

const user = db.users.findOne({_id: ObjectId(userId)});

accessReqObjId = ObjectId(accessRequestedUserId);
const aRU = db.accessRequestedUser.findOne({_id: accessReqObjId});

db.accessRequestedUser.update({_id: accessReqObjId}, {$set: {mappedUser: true, approved: true}});

const userObjId = ObjectId(userId);
db.users.update({_id: userObjId}, {
	$set: {
		accessReqUser: accessReqObjId,
		mappedUser: true,
		approved: true,
		email: aRU.email
	}
});

printjson(user);
printjson(aRU);