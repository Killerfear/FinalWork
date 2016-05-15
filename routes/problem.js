'use strict'


var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('lodash');
var multer = require('multer');
var bluebird = require('bluebird');
var io = require('socket.io-client');

var redis = require('../lib/redis-extend');

var socket = io('http://localhost:33445');

socket.on('connect', function() { console.log("OK"); });

var upload = multer({dest: 'uploads/' });

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var DB = require('../lib/mongoose-schema');

bluebird.promisifyAll(redis);
var OJ_RESULT = require('../lib/global').OJ_RESULT;



//获取题目列表
router.get('/list/:page', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var page = req.params.page;
		var skip = (page - 1) * 50;
		var limit = 50;

		var query = { isHidden: false };
		if (req.query.problemId) {
			query.problemId = { $gte: req.query.problemId };
		}

		if (req.query.content) {
			query.title = eval("/.*" + req.query.content + ".*/i");
			query.description = query.title;
		}

		console.log(query);

		var promises = yield [
													 DB.Problem.find(query).select("title problemId solvedNum -_id").sort("problemId").skip(skip).limit(limit),
													 DB.Problem.count(query)
												 ];
    var problems = promises[0];
		var problemCount = promises[1];

		if (user) {
			var solved = user.solved || [];
			var unsolved = _.difference(user.submit || [], solved) || [];
			console.log(user.solved);
			console.log(user.unsolved);

			var j = 0, k = 0;
			for (var i in problems) {
				var problem = problems[i] = problems[i].toObject();
				while (j < solved.length && solved[j] < problem.problemId) ++j;
				while (k < unsolved.length && unsolved[k] < problem.problemId) ++k;

				if (j < solved.length && solved[j] == problem.problemId) problem.state = 1;
				else if (k < unsolved.length && unsolved[k] == problem.problemId) problem.state = 2;
				else problem.state = 0;

				problems[i] = problem;
			}
		}



		return {
			problemCount: problemCount,
			problems: problems
		}
	}));
});

//获取题目描述
router.get('/data/:problemId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user || {};
		console.log(user);
		var problemId = req.params.problemId;
		console.log(problemId)
		var problem = yield DB.Problem.findOne({ problemId: parseInt(problemId) }, "-_id");
		console.log(problem);

		if (!problem || (!user.isAdmin && problem.isHidden)) throw { message: "题目不存在" }

		console.log(problem);

		return {
			result: "sucess",
			problem: problem
		}
	}));
});

//提交代码
router.post('/submit', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		console.log('zzz');
		var user = req.user;
		if (!user) {
			throw { message: "未登录" };
		}
		var problemId = parseInt(req.body.problemId);
		var contestId = null;
		if (req.body.contestId) contestId = parseInt(req.body.contestId);
		console.log(contestId);

		var problem = yield DB.Problem.findOne({ problemId: problemId }, "-_id");
		console.log('problem:', problem);

		if (!problem || (problem.isHidden && contestId == null)) throw { message: "题目不存在" }

		if (problem.isHidden) {
			var contest = yield DB.Contest.findOne({ contestId: contestId, problemId: problemId });
			if (!contest) throw { message: "题目不存在" }
			if (contest.endTime <= new Date().getTime()) throw { message: "比赛结束" };
			if (contest.startTime > new Date().getTime()) throw { message: "比赛未开始" };
		}

		var srcCode = req.body.srcCode;

		var solution = new DB.Solution({
			username: user.username,
			problemId: problemId,
			ip: req.ip,
			submitTime: new Date().getTime(),
			srcCode: srcCode,
			codeLength: srcCode.length,
			contestId: contestId,
			result: 0
		});

		console.log(solution);

		var pos = _.sortedIndex(user.submit.toObject(), problemId);
		if (user.submit.toObject()[pos] != problemId) {
			user.submit.splice(pos, 0, problemId);
		}

		yield solution.save();
		console.log("solution save done!");
		yield user.save();
		console.log("user save done!");
		console.log("after yield save()");

		var judgeData = {
			user: user,
			solutionId: solution.solutionId,
			srcCode: srcCode,
			problemId: problemId,
			judgeType: problem.judgeType,
			memLimit: problem.memLimit,
			timeLimit: problem.timeLimit
		}
		console.log(judgeData);
		socket.emit('judge', judgeData);
		console.log('emit done');
		//res.redirect('/status');
		return {
			result: "success"
		}
	}));
});



module.exports = router;
