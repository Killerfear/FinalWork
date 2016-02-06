var express = require('express');
var redis = require('redis');
var router = express.Router();
var co = require('co');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var _ = require('underscore');


var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var User = require('../module/user');
var mongo = require('../lib/mongo-extend');

var Hour = 60 * 60;

var tokenGen = co.wrap(function * (user) {
	var raw = user.username + Date().getTime() + user.salt;
	var token = crypto.createHash('sha256').update(raw).digest('hex');
	yield redis.Set(token, user.username);
	redis.Expire(token, 5 * Hour);
	return token;
});

var legalUsername = co.wrap(function * (text) {
	text = text.toLower();
	for (var i = 0; i < text.length; ++i) {
		var ch = text[i];
		if ('a' <= ch && ch <= 'z') continue;
		if ('0' <= ch && ch <= '9') continue;
		if (ch == '_') continue;
		return false;
	}
	return true;
});


router.get('/', function(req, res, next) {
	LogicHandler.Handle('login', req, next, co.wrap(function * () {
		return { title: '登录' }
	}));
});

//登录
router.post('/login', function(req, res, next) {
	LogicHandler.Handle('index', req, next, co.wrap(function * () {
		console.log('auth');
		var user = yield User.authenticate(req.body.name, req.body.password); 
		console.log(user);
		if (!user) throw { message: "帐号或密码错误" };
		console.log('tokenGen');
		var token = tokenGen(user);
		console.log('tokenGen done');
		return { title: 'haha', token: token };
	}));
});

//登出
router.get('/logout', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		redis.Del(req.query.token);
		return {};
	}));
});

//注册
router.post('/signup', function(req, res, next) {
	LogicHandler.Handle('signup', req, next, co.wrap(function *() {
		var body = req.body;

		if (!legalUsername(body.username)) throw { message: "账户名格式有误" }
		if (body.password.length < 6) throw { message: "密码长度过短" }
		if (body.password != body.reppassword) throw { message: "密码不一致" }

		var user = yield User.getByName(body.username);

		if (user) throw { message: "账户已存在" };

		user = {};

		user.username = body.username;
		user.password = body.password;
		user.nickname = body.nickname;
		user.email = body.email;
		user.gender = body.gender;

		user.salt = bcrypt.genSaltSync();
		user.password = bcrypt.hashSync(user.password, user.salt);

		user = _.pick(user, ['username', 'password', 'salt', 'nickname', 'email', 'gender']);

		yield mongo.addOne("User", user);
		return {};
	}));
});

//获取个人信息
router.get('/profile', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var user = getByToken(req.query.token);

		if (!user) throw { message: "token失效" }

		return user;
	}));
});

//修改个人信息
router.post('/profile', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var user = User.getByToken(req.body.token);

		if (!user) throw { message: "token失效" }
		var setter = _.pick(req.body, 'nickname', 'email', 'gender');

		user = yield mongo.findOneAndUpdate({ username: user.username }, { $set: setter }, { returnOriginal: false });
		user = user.value;
		return user;
	}));
});

//修改密码
router.post('/profile/password', function(req, res, next) {
	LogicHandler.Handle(req, next, co.wrap(function * () {
		var body = req.body;

		if (body.newPass != body.newRepPass) throw { message: "密码不一致" }

		var user = User.getByToken(req.body.token);

		if (!user) throw { message: "token失效" }

		var haxiPass = yield bcrypt.hash(body.oldPass, user.salt);

		if (haxiPass != user.password) throw { message: "密码错误" }

		user.password = body.newPass;
		user.salt = yield bcrypt.genSalt();
		user.password = yield bcrypt.hash(user.password, user.salt);

		user = _.pick(user, 'password', 'salt');
		yield mongo.updateOne(user, { $set: user });
		return { };
	}));
});




module.exports = router;
