var co = require('co');
var mongo = require('mongo-extend');
var ObjectId = require('mongodb').ObjectId;

exports.getById = co.wrap(function * (id, select) {
	var problem = yield mongo.find('Problem', { _id: ObjectId(id) }, {select: select});
	return problem;
});




