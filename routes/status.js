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

router.get('/solution/:solutionId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var solution = yield DB.Solution.findOne({ solutionId: req.params.solutionId })
																  .select("result -_id memory time");

		if (!solution) throw { message: "solution 不存在" };

		solution = solution.toObject();
		solution.memory >>= 10;
	  solution.resultText = OJ_RESULT[solution.result];
		return {
			pos: req.query.pos,
			solution: solution
		}
	}))
})

router.get('/search/:page', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var query = _.pick(req.query, "username", "problemId", "result", "contestId", "solutionId");

		query = _.omitBy(query, function(data) {
			return data.toString().length == 0;
		});
		console.log(query);

		var skip = (parseInt(req.params.page) - 1) * 50;
		var limit = 50;

		var promises = yield [ DB.Solution.find(query)
																			.select("-_id solutionId problemId username result memory time submitTime srcCode")
																		  .sort("-solutionId").skip(skip).limit(limit),
													 DB.Solution.count(query)
												 ]

		var solutions = promises[0];
		var solutionCount = promises[1];
		for (var i in solutions) {
			var solution = solutions[i] = solutions[i].toObject();
			solution.resultText = OJ_RESULT[solution.result];
			solution.codeLength = solution.srcCode.length;
			solution.memory >>= 10;
			delete solution.srcCode;
		}

		return {
			result: 'success',
			solutions: solutions,
			solutionCount: solutionCount
		}
	}));
});

router.get('/code/:solutionId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user || {};
		var solutionId = parseInt(req.params.solutionId);
		var solution = yield DB.Solution.findOne({solutionId: solutionId})
																		.select("srcCode username");
	  var srcCode = "";
		if (solution && (user.isAdmin || (user.username && solution.username == user.username))) {
			srcCode = solution.srcCode;
		}

		return {
			srcCode: srcCode
		}
	}));
})

router.get('/ce/:solutionId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user || {};
		var solutionId = req.params.solutionId;
		var solution = yield DB.Solution.findOne({solutionId: solutionId})
																		.select("-_id error username");
	  var ce = "";
		if (solution && (user.isAdmin || (user.username && solution.username == user.username))) {
			ce = solution.error;
		}

		return {
			ce: ce
		}
	}));
})
module.exports = router;
