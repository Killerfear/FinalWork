var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('underscore');

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var mongo = require('../lib/mongo-extend');
var ObjectID = require('mongodb').ObjectID;

//获取比赛列表
router.get('/list',  function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var param = req.query;
		var option = _.pick(param, 'limit', 'skip');

		var contests = yield mongo.find('Contest', { }, option);

		return { title: contests };
	}));
});

//获取某一个比赛题目列表
router.get('/', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		var contestId = req.query.contestId;

		var contest = yield mongo.find('Contest', { _id: ObjectID(contestId) });

		if (!contest || contest.isHidden) throw { message: "比赛不存在" }
		if (contest.isPrivate && !_.contains(contest.authorizee, user._id)) throw { message: "该比赛是私有的" };
			
		var curTime = new Date().getTime();
		if (curTime < contest.startTime) throw { message: "比赛未开始" }

		return { title: contest };
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


//创建比赛
router.post('/edit', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" };

		var param = req.body;
		var contest = _.pick(param, 'title', 'problemId', 'isPrivate', 'startTime', 'endTime', 'isHidden', 'authorizee');

		yield mongo.insert('Contest', contest);

		return { title: req.baseUrl + req.path };
	}));
});

//编辑比赛
router.post('/edit/update',function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" }

		var param = req.body;
		var contestId = ObjectID(param.contestId);

		var setter = _.pick(param, 'title', 'problemId', 'isPrivate', 'startTime', 'endTime', 'isHidden', 'authorizee');

		var doc = yield mongo.findOneAndUpdate('Contest', { _id: contestId }, { $set: setter , returnOriginal : false });

		return { title :  doc };
	}));
});

//删除比赛
router.get('/edit/delete', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" }

		var param = req.query;
		var contestId = ObjectID(param.contestId);

		var result = yield mongo.findOneAndDelete("Contest", { _id: contestId });

		return { title : result }
	}));
});


module.exports = router;
