var co = require('co');
var mongo = require('../lib/mongo-extend');
var ObjectId = require('mongodb').ObjectId;
var redis = require('../lib/redis-extend');
var bcrypt = require('bcrypt');


exports.getByName = co.wrap(function * (name) {
	var user = yield mongo.findOne("User", { username: name }, {select: { _id: 0 }});
	return user;
});

exports.getById = co.wrap(function * (id) {
	if (typeof id == 'string') {
		id = ObjectId(id);
	}

	var user = yield mongo.findOne("User", { _id: id });

	return user;
});

exports.authenticate = co.wrap(function*(name, pass) {
	var user = yield exports.getByName(name);
	if (user) {
		var haxi = yield bcrypt.hash(pass, user.salt);
		if (haxi != user.password) user = "";
	}
	return user;
});

exports.getBySession = co.wrap(function * (session) {
	var user;
	if (session && session.userId) {
		var user = exports.getById(session.userId);
	}
	return user;
});


