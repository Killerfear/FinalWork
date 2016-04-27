'use strict'

var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');

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
		var user = req.user || {};

		var contestId = req.params.contestId;

		var contest = yield DB.Contest.findOne({ contestId: contestId })
																	.select("-_id contestId title startTime endTime problems authorizee");


		if (!contest || (!user.isAdmin && contest.isHidden)) throw { message: "比赛不存在" }
		contest = contest.toObject();
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

		return {
			contest: contest
		}
	}));
});



//获取比赛排名
router.get('/rank/:contestId', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var contest = yield DB.Contest.findOne({ contestId: req.params.contestId, isHidden: false })
																	.select("-_id");

	  if (!contest) throw { message: "比赛不存在" };
		contest = contest.toObject();

		var solutions = yield DB.Solution.find({ contestId: req.params.contestId })
																	   .select("-_id username result solutionId problemId submitTime")
																		 .sort("-solutionId");



		console.log("before map:", solutions);

		var participants = contest.authorizee;

		solutions = _.map(solutions, function(data) {
			if (data.result > 2) {
				if (OJ_RESULT[data.result] == "Accept") {
					data.result = 3;
				} else {
					data.result = 4;
				}
			}

			console.log(data.problemId);
			data.problemId = _.findIndex(contest.problems, ['problemId', data.problemId]);
			return data;
		});
		console.log("after map:", solutions);

		var result = _.reduce(solutions, function(result, solution) {
			console.log(result);
			var user = solution.username;
			var charId = solution.problemId;
			if (!result[user]) {
				result[user] = { penalty: 0, solved: 0 };
				participants.push(user);
			}
			if (!result[user][charId]) result[user][charId] = {  wa: 0, wait: 0 };
			if (solution.result  > 3) result[user][charId]['wa']++;
			else if (solution.result <= 2) result[user][charId]['wait']++;
			else {
				console.log(solution.submitTime);
				result[user][charId]['ac'] = ~~((solution.submitTime - contest.startTime) / (1000 * 60));
				result[user][charId]['wait'] = result[user][charId]['wa'] = 0;
			}
			return result;
		}, {})
		console.log("after reduce:", result);

		participants.sort();
		participants = _.sortedUniq(participants);

		var userInfos = yield DB.User.find({ username: { $in: participants }})
																.select("-_id username nickname")
																.sort("username");

		var ranklist = [];

		for (var i in contest.authorizee) {
				var user = contest.authorizee[i];
				if (!result[user]) {
					ranklist.push({ username: user, solved: 0, penalty: 0, problems: {} });
				}
		}


		for (var user in result) {
			var data = { problems: {}, penalty: 0, solved: 0 };
			for (var id = 0; id < contest.problems.length; ++id) {
				if (!result[user][id]) {
					result[user][id] = { wa: 0, wait: 0 };
				}
				data.problems[id] = result[user][id];
				var info = result[user][id];
				if (_.has(info, "ac")) {
					++data.solved;
					data.penalty += info.ac + 20 * info.wa;
					info.ac *= 60 * 1000;
				} else {
					info.ac = -1;
					info.wa = -info.wa;
					info.wait = -info.wait;
				}
				info.wa += info.wait;
				result[user][id] = _.omit(info, "wait");
			}
			data.username = user;
			console.log(user);
			ranklist.push(data);
		}

		ranklist = _.orderBy(ranklist, ['solved', 'penalty', 'username'], ['desc', 'asc', 'asc'])
		for (var i in ranklist) {
			var rank = ranklist[i];
			var user = rank.username;
			var pos = _.sortedIndexOf(participants, user);
			assert.notEqual(pos, -1, "Must be founded");
			rank.nickname = userInfos[pos].nickname;
		}


		return {
			ranklist: ranklist
		}
	}))
})


module.exports = router;
