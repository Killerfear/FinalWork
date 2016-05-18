var co = require('co');
var DB = require('../lib/mongoose-schema');
var ObjectId = require('mongodb').ObjectId;
var redis = require('../lib/redis-extend');
var bcrypt = require('bcrypt');


exports.getByName = co.wrap(function * (name) {
	return yield DB.User.findOne({ username: name });
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
	console.log('getBySession');
	var user;
	if (session && session.uid) {
		console.log('getBySession getById');
		user = exports.getByName(session.uid);
	}
	return user;
});


exports.updateByName = co.wrap(function * (user, option) {
	return yield DB.User.findOnAndUpdate('User', { username: user.username } , { $set: user }, option);
});

exports.create = co.wrap(function * (user) {
	return yield (new DB.User(user)).save();
});
