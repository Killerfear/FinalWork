'use strict'

var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('lodash');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var OJ_RESULT = require('../lib/global').OJ_RESULT;
var DB = require('../lib/mongoose-schema');

const limit = 50;

//获取比赛列表
router.get('/list/:page',  function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var skip = (req.params.page - 1) * limit;

		var promises = yield [
														DB.Contest.find({ isHidden: false })
																			.select("-_id contestId title isPrivate startTime endTime")
																			.sort("-startTime")
																			.skip(skip)
																			.limit(limit),
														DB.Contest.count({ isHidden: false })
													];

		var contests = promises[0];
		var contestCount = promises[1];

		return {
			contests: contests,
			contestCount: contestCount
		}
	}));
});

//获取某一个比赛的Overview
router.get('/show/:contestId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var contestId = req.params.contestId;

		var contest = yield DB.Contest.findOne({ contestId: contestId })
																	.select("-_id contestId title startTime endTime problems authorizee");

		contest = contest.toObject();

		if (!contest || (!user.isAdmin && contest.isHidden)) throw { message: "比赛不存在" }
		if (contest.isPrivate && !user.isAdmin && _.indexOf(contest.authorizee, user.username) == -1) {
			return {
				contest: _.pick(contest, "isPrivate")
			}
		}

		var curTime = new Date().getTime();

		if (curTime < contest.startTime) {
			contest.isStart = false;
			contest = _.pick(contest, "isStart", "title", "startTime", "endTime");
			console.log("this path");
			return {
				contest: contest
			}
		}

		contest.isStart = true;

		contest = _.omit(contest, "authorizee");
		console.log(contest.problems);

		return {
			contest: contest
		}
	}));
});

//获取比赛题目描述
router.get('/problem', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		//contestId, problemId,
		var contestId = req.query.contestId;
		var problemId = parseInt(req.query.problemId);
		var contest = yield mongo.find("Contest", { _id: ObjectID(contestId), problems: problemId });

		if (!contest || contest.isHidden) throw { message: "不存在该比赛或该比赛不存在该题目" };
		if (contest.isPrivate && !_.contains(contest.authorizee, user._id)) throw { message: "该比赛是私有的" };

		var curTime = new Date().getTime();
		if (curTime < contest.startTime) throw { message: "比赛未开始" }

		var problem = yield mongo.find('Problem', { _id: problemId });

		return { title : contest };
	}));
});


//获取比赛排名
router.get('/rank/:contestId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var contest = yield DB.Contest.findOne({ contestId: req.params.contestId, isHidden: false })
																	.select("-_id");

	  if (!contest) throw { message: "比赛不存在" };

		var solutions = yield DB.Solution.find({ contestId: req.params.contestId })
																	   .select("-_id username result solutionId problemId submitTime")
																		 .sort("-solutionId");

		solutions = _.map(solutions, function(data) {
			if (data.result > 2) {
				if (OJ_RESULT[data.result] == "Accept") {
					data.result = 3;
				} else {
					data.result = 4;
				}
			}

			data.problemId = _.findIndex(contest.problems, function(problem) { return problem.problemId == data.problemId});
			return data;
		});

		var result = _.reduce(solutions, function(result, solution) {
			var user = solution.username;
			var charId = solution.problemId;
			if (!result[user]) result[user] = { penaty: 0, solved: 0 };
			if (!result[user][charId]) result[user][charId] = {  wa: 0, wait: 0 };
			if (solution.result  > 3) result[user][charId]['wa']++;
			else if (solution.result <= 2) result[user][charId]['wait']++;
			else {
				result[user][charId]['ac'] = parseInt(solutions.submitTime / 1000 + 0.00000001);
				result[user][charId]['wait'] = result[user][charId]['wa'] = 0;
			}
		}, {})

		var ranklist = [];
		for (var user in result) {
			for (var id = 0; id < contest.problems.length; ++id) {
				if (!result[user][id]) {
					result[user][id] = {};
				}
				var info = result[user][id];
				if (_.has(info, "ac")) {
					++result[user].solved;
					result[user].penaty += info.ac + 20 * 60 * info.wa;
				}
				info.wa += info.wait;
				result[user][id] = _.omit(info, "wait");
			}
			result[user].username = user;
			ranklist.push(result[user]);
		}


		ranklist = _.orderBy(ranklist, ['solved', 'penaty'], ['desc', 'asc'])


		return {
			ranklist: ranklist
		}
	}))
})


module.exports = router;
