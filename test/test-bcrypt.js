
var express = require('express');
var router = express.Router();
var User = require('../module/user');
var _ = require('underscore');
var co = require('co');


co(function * () {
	setTimeout(function() {
		throw { messge: "异步异常" };
	}, 3000);
}).then(function(data) {
	console.log('success');
}, function(err) {
	console.log("err", err);
});



