var co = require('co');
var db = require('../lib/mongoose-schema');
var ObjectId = require('mongodb').ObjectId;
var redis = require('../lib/redis-extend');
var bcrypt = require('bcrypt');


exports.getByName = co.wrap(function * (name) {
	return yield db.User.findOne({ username: name });
});

exports.authenticate = co.wrap(function*(name, pass) {
	console.log('name:', name, 'pass:', pass);
	var user = yield exports.getByName(name);
	console.log(user);
	if (user) {
		var haxi = bcrypt.hashSync(pass, user.salt);
		if (haxi != user.password) user = "";
	}
	return user;
});

exports.getBySession = co.wrap(function * (session) {
	var user;
	if (session && session.uid) {
		var user = exports.getById(session.uid);
	}
	return user;
});


exports.updateByName = co.wrap(function * (user, option) {
	return yield db.User.findOnAndUpdate('User', { _id: user._id } , { $set: user }, option);
});

exports.create = co.wrap(function * (user) {
	return yield db.User(user).save();
});
