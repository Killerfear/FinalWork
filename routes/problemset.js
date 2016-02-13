var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('underscore');
var multer = require('multer');
var io = require('socket.io-client');

var socket = io.connect('127.0.0.1:33445');


socket.on('connect', function() {});



var upload = multer({dest: 'uploads/' });


var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var mongo = require('../lib/mongo-extend');



//新增题目描述
router.post('/description/add', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;
		console.log(user);

		if (!user.isAdmin) throw { message: "无权限" }

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

		var problem = _.pick(param, 'title', 'description', 'input', 'output', 'sampleInput', 'sampleOutput', 'isHidden');
		problem._id = id;

		yield mongo.addOne('Problem', problem);

		return { title: req.baseUrl + req.path }
	}));
});

//修改题目描述
router.post('/description/update', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;
		console.log(user);

		if (!user.isAdmin) throw { message: "无权限" }

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

//获取题目数据列表
router.get('/samplelist', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" }

		var problemId = req.query.problemId;
		var files = fs.readdirSync(__dirname + "/problem/" + problemId);

		if (!_.isArray(files)) throw files;

		var dataFile = [];
		files.forEach(function(file) {
			if (!file.match(/.*\.(in|out)/)) return;
			dataFile.push(file);
		});

		return { title: dataFile };
	}));
});

//获取题目数据
router.get('/sample', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" };

		var problemId = req.query.problemId;
		var fileName = req.query.name;

		var filePath = __dirname + "/problem/" + problemId + "/" + fileName;

		if (!fs.existsSync(filePath)) throw { message: filePath + " 不存在" }

		var text = fs.readFileSync(filePath, 'utf8');

		return { title: text };
	}));
	
});

//添加题目测试数据
router.post('/sample/add', upload.single('file'), function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var file = req.file;
		if (!file) throw { message: "参数缺失" }

		var user = req.user;
		console.log(user);
		if (!user.isAdmin) throw { message: "无权限" }

		var path = './problem/' + req.body.problemId + '/' + file.originalname;
		console.log(path);

		var err = fs.renameSync(file.path, path);
		console.log(err);

		fs.unlinkSync(file.path);

		return { title : req.baseUrl + req.path }
	}));
});

//修改题目测试数据
router.post('/sample/update', function(req, res, next) {
	var user = req.user;

	if (!user.isAdmin) throw { message: "无权限" }

	var problemId = req.body.problemId;
	var name = req.body.fileName;
	var data = req.body.data;

	var filePath = __dirname + "/problem/" + problemId + "/" + name;

	var err;
	if (fs.existsSync(filePath) {
		err = fs.writeFileSync(filePath, data, 'utf-8');
	} else {
		err = { message: "文件不存在" };
	}

	if (err) throw err;

	return { title: req.baseUrl + req.path };
});





//删除题目测试数据
router.post('/sample/delete', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;

		if (!user.isAdmin) throw { message: "无权限" }

		var id = req.body.problemId;
		var name = req.body.file;

		var filePath = __dirname + '/problem/' + id + '/' + name;
		var err = fs.unlinkSync(filePath);

		if (err) throw { message: "删除文件失败", err: err };

		return { title : req.baseUrl + req.path }
	}));
});


//获取题目列表
router.get('/', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;

		var skip = req.query.skip, limit = req.query.limit;

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

		return { title: problems }
	}));
});

//获取题目描述
router.get('/problem', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;
		var problemId = req.query.problemId;
		var problem = yield mongo.findOne('Problem', { _id: parseInt(problemId) });

		if (!problem || (!user.isAdmin && problem.isHidden)) throw { message: "题目不存在" }

		console.log(problem);
		return problem;
	}));
});

//提交代码
router.post('/submit', function(req, res, next) {
	LogicHandler.Handle('index', req, res, next, co.wrap(function * () {
		var user = req.user;
		var problemId = req.query.problemId;
		var problem = yield mongo.findOne('Problem', { _id: parseInt(problemId) }, { select: { files: 1 } });

		if (!problem || (!user.isAdmin && problem.isHidden)) throw { message: "题目不存在" }

		var srcCode = req.body.srcCode;
		var solId = yield mongo.findOneAndUpdate('Stat', { name: 'solution' }, { select: { _id: 0, count: 1 } });
		solId = solId.count;

		var solution = {
			_id: solId,
			ip: req.ip,
			memory: 0,
			time: 0,
			submitTime: new Date().getTime(),
			codeLength: srcCode.length.toString() + 'B', 
			result: 0
		}

		var promises = [];
		promises.push(mongo.insert('Solution',solution));
		
		if (!_.contains(user.submit, problemId)) {
			promises.push(mongo.insert('User', { _id: user._id }, { $addToSet: { submit: problemId } }));
		}

		yield promises;
		
		socket.emit('judge', { user: user, solutionId: solution._id, srcCode: srcCode, problemId: problemId, judgeType: 0 });
		return { title: req.baseUrl + req.path };
	}));
});



module.exports = router;
