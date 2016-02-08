var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('underscore');
var multer = require('multer');
var upload = multer({dest: 'uploads/' });


var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var mongo = require('../lib/mongo-extend');


router.get('/problem', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {

	}));
});

//新增题目描述
router.post('/description/add', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = yield User.getBySession(req.session);
		console.log(user);

		if (!user || !user.isAdmin) throw { message: "会话无效" }

		var param = req.body;

		var sampleInput = param.sampleInput;
		var sampleOutput = param.sampleOutput;

		var id = yield mongo.findOneAndUpdate('Stat', { name: 'problem' }, { $inc: { count: 1 }});

		id = id.value.count;

		var path = './problem/' + id;

		var err = fs.mkdirSync(path, 600);
		if (err) throw err;

		err = fs.writeFileSync(path + '/sample.in', sampleInput, 'utf-8');
		if (err) throw err;

		err = fs.writeFileSync(path + '/sample.out', sampleOutput, 'utf-8');
		if (err) throw err;

		var problem = _.pick(param, 'title', 'description', 'input', 'output', 'sampleInput', 'sampleOutput');
		problem._id = id;

		problem.file = Array();
		problem.file.push('sample.in');
		problem.file.push('sample.out');
		problem.isHidden = true;

		yield mongo.addOne('Problem', problem);

		return { title: req.baseUrl + req.path }
	}));
});

//修改题目描述
router.post('/description/update', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = yield User.getBySession(req.session);
		console.log(user);

		if (!user || !user.isAdmin) throw { message: "会话失效" }

		var setter = _.pick(req.body, 'title', 'description', 'input', 'output', 'sampleInput', 'sampleOutput', 'isHidden');

		var problemId = parseInt(req.body.problemId);
		yield mongo.findOneAndUpdate('Problem', { _id: problemId }, { $set: setter });

		var err;
		var path = './problem/' + problemId;

		if (setter.sampleInput) {
			err = fs.writeFileSync(path + '/sample.in', setter.sampleInput, 'utf-8');
			if (err) throw err;
		}

		if (setter.sampleOutput) {
			err = fs.writeFileSync(path + '/sample.out', setter.sampleOutput, 'utf-8');
			if (err) throw err;
		}

		return { title : req.baseUrl + req.path }
	}));
});

//添加题目测试数据
router.post('/sample/add', upload.single('file'), function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var file = req.file;
		if (!file) throw { message: "参数缺失" }

		var user = yield User.getBySession(req.session);
		console.log(user);
		if (!user || !user.isAdmin) throw { message: "会话失效" }

		var path = './problem/' + req.body.problemId + '/' + file.originalname;
		console.log(path);

		var err = fs.renameSync(file.path, path);
		console.log(err);

		yield mongo.findOneAndUpdate('Problem', { _id: parseInt(req.body.problemId) }, { $addToSet: { file: file.originalname } });

		return { title : req.baseUrl + req.path }
	}));
	
});









module.exports = router;
