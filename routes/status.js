'use strict'

var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('lodash');
var multer = require('multer');
var io = require('socket.io-client');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var DB = require('../lib/mongoose-schema');

router.get('/', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var query = _.pick(req.query, "userName", "problemId", "result", "contestId");
		var skip = (req.query.page - 1) * 50;
		var limit = 50;

		var solutions = yield
			DB.Solution.find(query)
								 .select("-_id -ip")
								 .sort("-solutionId")
								 .skip(skip)
								 .limit(limit)
								 .exec();

		var user = req.user;
		for (var i in solutions) {
			var solution = solutions[i];
			if (solution.userName != user.userName) solution.srcCode = null;
		}

		var totalCount = (yield DB.Solution.collection.stats()).count;

		return {
			page: 'status',
			solutions: res
		}
	}));
});

module.exports = router;
