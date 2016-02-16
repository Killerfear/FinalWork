var co = require('co');
var mongo = require('../lib/mongo-extend');

exports.getById = co.wrap(function * (id, select) {
	return yield mongo.findOne('Problem', { _id: parseInt(id) }, { select: select });
});

exports.update = co.wrap(function * (problem) {
	return yield mongo.findOneAndUpdate('Problem', { _id: parseInt(problem._id) }, { $set: problem });
});

exports.create = co.wrap(function * (problem) {
	return yield mongo.insert('Problem', problem);
});
