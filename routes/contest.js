var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('lodash');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var DB = require('../lib/mongoose-schema');

const limit = 50;

//获取比赛列表
router.get('/list/:page',  function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var skip = (req.params.page - 1) * limit;

		var promises = yield [
														DB.Contest.find({ isHidden: false })
																			.select("contestId title isPrivate startTime endTime")
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
																	.select("-_id title startTime endTime problems authorizee");

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
			contest = _.pick("isStart");
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



module.exports = router;
