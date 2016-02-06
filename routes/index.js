var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/user/login', function(req, res, next) {
  res.render('login', { title: '登录' });
});

router.get('/user/signup', function(req, res, next) {
	res.render('signup', { title: '注册' });
});

module.exports = router;
