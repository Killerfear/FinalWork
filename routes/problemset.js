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
var OJ_RESULT = ['Pending', 'Compiling', 'Runing', 'Compile Error', 'Runtime Error', 'Memory Limit Exceed', 'Time Limit Exceed', 'Output Limit Exceed', 'Accept', 'Wrong Answer', 'Presentation Error' ];



//获取题目列表
router.get('/', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var page = req.query.page;
		var skip = (page - 1) * 50;
		var limit = 50;

		var problems = yield
				DB.Problem.find({ isHidden : false })
					.select("title problemId -_id")
					.sort("problemId")
					.skip(skip)
					.limit(limit)
					.exec();

		var solved = user.solved;
		var unsolved = _.difference(user.submit, solved);

		solved.sort();
		unsolved.sort();

		var j = 0, k = 0;
		for (var i in problems) {
			var problem = problems[i];
			while (j < solved.length && solved[j] < problem.problemId) ++j;
			while (k < unsolved.length && unsolved[k] < problem.problemId) ++k;

			if (j < solved.length && solved[j] == problem.problemId) problem.state = 1;
			else if (k < unsolved.length && unsolved[k] == problem.problemId) problem.state = 2;
			else problem.state = 0;
		}

		return { page:'problemlist', problems: problems, problemNum: 500, username: user.username , isAdmin: user.isAdmin }
		//return problem
	}));
});

//获取题目描述
router.get('/problem', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		var problemId = req.query.problemId;
		var problem = yield DB.Problem.findOne({ problemId: parseInt(problemId) });

		if (!problem || (!user.isAdmin && problem.isHidden)) throw { message: "题目不存在" }

		console.log(problem);

		return {
			page: "problem-main",
			problem: problem,
			isAdmin: user.isAdmin
		}
	}));
});

//提交代码
router.post('/submit', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		var problemId = parseInt(req.body.problemId);
		var contestId = null;
		if (req.query.contestId) contestId = parseInt(req.query.contestId);

		var problem = yield DB.Problem.findOne({ problemId: problemId });

		if (!problem || (problem.isHidden && !contestId)) throw { message: "题目不存在" }

		if (problem.isHidden) {
			var isInContest = yield DB.Contest.findAndCount({ _id: contestId, problemId: problemId });
			if (!isInContest) throw { message: "题目不存在" }
		}

		var srcCode = req.body.srcCode;

		var solution = new DB.Solution({
			userName: user.username,
			problemId: problemId,
			ip: req.ip,
			memory: 0,
			time: 0,
			submitTime: new Date().getTime(),
			srcCode: srcCode,
			codeLength: srcCode.length,
			contestId: contestId,
			result: OJ_RESULT[0]
		});

		//console.log(solution);

		var promises = [];
		promises.push(solution.save());
		user.submit.addToSet(problemId);
		promises.push(user.save());

		yield promises;

		socket.emit('judge', { user: user, solutionId: solution._id, srcCode: srcCode, problemId: problemId, judgeType: 0 });
		//res.redirect('/status');
		return {
			json: {
				result: "success"
			}
		}
	}));
});



module.exports = router;
