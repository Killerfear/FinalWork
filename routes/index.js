var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/user/login', function(req, res, next) {
	res.render('login', { title: '登录' , pass_error: '' });
});

router.get('/user/signup', function(req, res, next) {
	res.render('signup', { title: '注册', msg: [] });
});

router.get('/problemset/edit', function(req, res, next) {
	res.render('edit', { title: '题目编辑' });
});

router.get('/problemset/sample/', function(req, res, next) {
	res.render('sample', { title: '题目数据' });
});

module.exports = router;
