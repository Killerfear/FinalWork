var express = require('express');
var redis = require('redis');
var router = express.Router();
var co = require('co');
var User = require('../module/user');
var crypto = require('crypto');
var bcrypt = require('bcrypt');

var User = require('../lib/user');
var LogicHandler = require('../lib/logic-handler');

var Hour = 60 * 60;

var tokenGen = co.wrap(function * (user) {
	var raw = user.username + Date().getTime() + user.salt;
	var token = crypto.createHash('sha256').update(raw).digest('hex');
	yield redis.Set(token, user.username);
	redis.Expire(token, 5 * Hour);
	return token;
});


//登录
router.post('/user/login', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var user = yield User.authenticate(req.body.name, req.body.password);
		if (!user) throw { msg: "帐号或密码错误" };
		var token = tokenGen(user);
		return { token: token };
	});
});

//登出
router.get('/user/logout', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		redis.Del(req.query.token);
		return {};
	});
});

//注册
router.post('/user/signup', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function *() {
		var body = req.body;

		if (containSapce(body.username)) throw { msg: "账户名格式有误" }
		if (body.password.length < 6) throw { msg: "密码长度过短" }
		if (body.password != body.reppassword) throw { msg: "密码不一致" }

		var user = yield User.getByName(body.username);

		if (!user) throw { msg: "账户已存在" };

		user.username = body.username;
		user.password = body.password;
		user.nickname = body.nickname;
		user.email = body.email;
		user.gender = body.gender;

		user.salt = yield bcrypt.genSalt(10);
		user.password = yield bcrypt.hash(user.password, user.salt);

		user = _.pick(user, 'username', 'password', 'salt', 'nickname', 'email', 'gender');

		yield mongo.addOne("User", user);
		return {};
	});
});

//获取个人信息
router.get('/user/profile', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var user = getByToken(req.query.token);

		if (!user) throw { msg: "token失效" }

		return user;
	});
});

//修改个人信息
router.post('/user/profile', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var user = User.getByToken(req.body.token);

		if (!user) throw { msg: "token失效" }
		var setter = _.pick(req.body, 'nickname', 'email', 'gender');

		user = yield mongo.findOneAndUpdate({ username: user.username }, { $set: setter });
		user = user.value;
		return user;
	});
});

//修改密码
router.post('user/profile/password', function(req res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var body = req.body;

		if (body.newPass != body.newRepPass) throw { msg: "密码不一致" }

		var user = User.getByToken(req.body.token);

		if (!user) throw { msg: "token失效" }

		var haxiPass = yield bcrypt.hash(body.oldPass, user.salt);

		if (haxiPass != user.password) throw { msg: "密码错误" }

		user.password = body.newPass;
		user.salt = yield bcrypt.genSalt(10);
		user.password = yield bcrypt.hash(user.password, user.salt);

		user = _.pick(user, 'password', 'salt');
		yield mongo.updateOne(user, { $set: user });
		return { };
	});
});




module.exports = router;
