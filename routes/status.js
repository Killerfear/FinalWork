'use strict'

var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('lodash');
var multer = require('multer');
var io = require('socket.io-client');
var redis = require('../lib/redis-extend');
var bluebird = require('bluebird');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var DB = require('../lib/mongoose-schema');
var OJ_RESULT = require('../lib/global').OJ_RESULT;

bluebird.promisifyAll(redis);

router.get('/search/:page', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var query = _.pick(req.query, "username", "problemId", "result", "contestId");
		var skip = (parseInt(req.query.page) - 1) * 50;
		var limit = 50;

		var promises = yield [ DB.Solution.find(query) .select("-_id solutionId problemId username result memory time submitTime srcCode")
																		  .sort("-solutionId").skip(skip).limit(limit).exec(),
													 redis.getAsync('solutionCount')
												 ]

		var solutions = promises[0];
		var solutionCount = promises[1];
		var user = req.user;
		for (var i in solutions) {
			var solution = solutions[i] = solutions[i].toObject();
			solution.resultText = OJ_RESULT[solution.result];
			if (solution.userName != user.userName) solution.srcCode = null;
		}

		return {
			result: 'success',
			solutions: solutions,
			solutionCount: solutionCount
		}
	}));
});

module.exports = router;
