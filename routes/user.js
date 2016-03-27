var express = require('express');
var router = express.Router();
var co = require('co');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var _ = require('underscore');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');

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


function buildJson(data) { return { json: data } };


//登录
router.post('/login', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		console.log('auth');
		var user = yield User.authenticate(req.body.username, req.body.password); 
		console.log(user);

		if (!user) {
			return {
				page: 'login',
				title: '登录',
				pass_error: "帐号或密码错误"
			}
		}

		if (req.session) req.session.regenerate(function(err) { console.log(err) });

		req.session.uid = user._id;

		req.session.save();
		console.log(req.session);

		res.redirect('/problemset?page=1');
		console.log('Not pass');
	}));
});

//登出
router.get('/logout', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		req.session.destroy();
		res.redirect('/user/login');
	}));
});

//注册
router.post('/signup', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function *() {
		var body = req.body;

		if (!legalUsername(body.username)) return buildJson({ result: "fail", msg: "账户名格式有误" });
		if (body.password.length < 6) return buildJson({ result: 'fail', msg: "密码长度过短" });
		if (body.password != body.reppassword) return buildJson({ result: 'fail', msg: "密码不一致" });

		var user = yield User.getByName(body.username);

		if (user) return buildJson({ result : 'fail', msg: "账户已存在" });

		user = {};

		user.ip = req.ip;
		user.email = body.email;
		user.submit = [];
		user.solved = [];
		user.gender = body.gender;
		user._id = body.username;
		user.password = body.password;
		user.nickname = body.nickname;
		user.registTime = new Date().getTime();

		user.salt = bcrypt.genSaltSync();
		user.password = bcrypt.hashSync(user.password, user.salt);

		yield User.create(user);
		return buildJson({ result: 'success', msg: '注册成功'});
	}));
});

//获取个人信息
router.get('/profile', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		return req.user;
	}));
});

//修改个人信息
router.post('/profile', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var setter = _.pick(req.body, 'nickname', 'email', 'gender');

		user = _.extend(user, setter);
		
		user = yield User.update(user, { returnOriginal: false });
		user = user.value;
		return user;
	}));
});

//修改密码
router.post('/profile/password', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var body = req.body;

		if (body.newPass != body.newRepPass) throw { message: "密码不一致" }

		var user = req.user;

		var haxiPass = yield bcrypt.hash(body.oldPass, user.salt);

		if (haxiPass != user.password) throw { message: "密码错误" }

		user.password = body.newPass;
		user.salt = bcrypt.genSaltSync();
		user.password = bcrypt.hashSync(user.password, user.salt);

		user = _.pick(user, 'password', 'salt');
		yield User.update(user);
		return { };
	}));
});

module.exports = router;
