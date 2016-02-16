var co = require('co');
var mongo = require('../lib/mongo-extend');


exports.getById = co.wrap(function * (id, select) {
	if (!select) select = {};

	id = parseInt(id);
	return yield mongo.findOne('Solution', { _id: id }, { select: select });
});

exports.update = co.wrap(function * (solution) {
	var id = parseInt(solution._id);
	return yield mongo.findOneAndUpdate('Solution', { _id: id }, { $set: solution});
});

exports.create = co.wrap(function * (solution) {
	solution._id = parseInt(solution._id);
	return yield mongo.insert('Solution', solution);
});



