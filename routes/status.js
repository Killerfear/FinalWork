var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('underscore');
var multer = require('multer');
var io = require('socket.io-client');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var mongo = require('../lib/mongo-extend');

router.get('/', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var query = { userName: "", problemId: "", contestId: ""};
		var param = req.query;

		query = _.extendOwn(query, param);

		var page = req.query;

		var option = { sort: {submitTime: -1}, skip: (page - 1) * 50, limit: 50 };
		option = _.extendOwn(option, query);	

		var res = yield mongo.find('Solution', {}, option);

		return {
			page: 'status',
			solutions: res
		}
	}));
});

module.exports = router;
