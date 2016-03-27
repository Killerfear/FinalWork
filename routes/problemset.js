var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('underscore');
var multer = require('multer');
var redis = require('../lib/redis-extend');
var bluebird = require('bluebird');
var io = require('socket.io-client');

var socket = io.connect('127.0.0.1:33445');

socket.on('connect', function() {});

var upload = multer({dest: 'uploads/' });

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var mongo = require('../lib/mongo-extend');

bluebird.promisifyAll(redis);


//获取题目列表
router.get('/', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var page = req.query.page;
		var skip = (page - 1) * 50;
		var limit = 50;

		var problems = yield mongo.find('Problem', { }, { skip: skip, limit: limit, select: { _id: 1, title: 1 }});

		var solved = user.solved;
		var unsolved = _.difference(user.submit, solved);

		solved.sort();
		unsolved.sort();

		var j = 0, k = 0;
		for (var i = 0; i < problems.length; ++i) {
			var problem = problems[i];
			while (j < solved.length && solved[j] < problem._id) ++j;
			while (k < unsolved.length && unsolved[k] < problem._id) ++k;

			if (j < solved.length && solved[j] == problem._id) problem.state = 1;
			else if (k < unsolved.length && unsolved[k] == problem._id) problem.state = 2;
			else problem.state = 0;
		}

		return { page:'problemlist', problems: problems, problemNum: 500, username: user._id , isAdmin: user.isAdmin }
	}));
});

//获取题目描述
router.get('/problem', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		var problemId = req.query.problemId;
		var problem = yield mongo.findOne('Problem', { _id: parseInt(problemId) });

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

		var problem = yield mongo.findOne('Problem', { _id: problemId }, { select: { files: 1 } });

		if (!problem || (problem.isHidden && !contestId)) throw { message: "题目不存在" }

		if (problem.isHidden) {
			var isInContest = yield mongo.findAndCount('Contest', { _id: contestId, problemId: problemId });
			if (!isInContest) throw { message: "题目不存在" }
		}

		var srcCode = req.body.srcCode;
		var solId = yield redis.incrAsync("solutions");
		solId = solId.count;

		var solution = {
			_id: solId,
			userName: user._id,
			problemId: problemId,
			ip: req.ip,
			memory: 0,
			time: 0,
			submitTime: new Date().getTime(),
			srcCode: srcCode,
			codeLength: srcCode.length.toString() + 'B', 
			contestId: contestId,
			result: 0
		}

		var promises = [];
		promises.push(mongo.addOne('Solution',solution));
		
		if (!_.contains(user.submit, problemId)) {
			promises.push(mongo.updateOne('User', { _id: user._id }, { $addToSet: { submit: problemId } }));
		}

		yield promises;
		
		socket.emit('judge', { user: user, solutionId: solution._id, srcCode: srcCode, problemId: problemId, judgeType: 0 });
		res.redirect('/status');
		return {
			json: {
				result: "success"
			}
		}
	}));
});



module.exports = router;
