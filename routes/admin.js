var express = require('express');
var router = express.Router();
var co = require('co');
var fs = require('fs');
var _ = require('underscore');
var multer = require('multer');
var redis = require('../lib/redis-extend');
var upload = multer({dest: 'uploads/' });

var User = require('../module/user');
var LogicHandler = require('../lib/logic-handler');
var mongo = require('../lib/mongo-extend');

router.get('*', function(req, res, next) {
	if (!user.isAdmin) return next({ message: "无权限" };
	next();
});

//管理员主页 类似题目列表页面
router.get('/', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var page = parseInt(req.query.page);
		var skip = 50 * (page - 1);
		var limit = 50;

		var problems = yield mongo.find({}, { skip: skip, limit: limit });
		var problemCount = yield redis.getAsync('problemCount');

		return { page: 'admin', problems: problems, problemCount : problemCount }
	}));
});

//题目编辑页面
router.get('/problem/edit', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problem = { };
		if (req.query.problemId) {
			problem = yield mongo.findOne({ _id: parseInt(problemId) });
		}
		return { "admin-edit", detail: problem };
	}));
});


//新增题目描述
router.post('/problem/add', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		if (!user.isAdmin) throw { message: "无权限" }

		var param = req.body;

		var sampleInput = param.sampleInput;
		var sampleOutput = param.sampleOutput;

		var id = yield redis.incrSync("problemCount", 1);

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

		res.redirect('back');
	}));
});

//修改题目描述
router.post('/problem/update', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
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

		res.end();

	}));
});

//删除题目描述
router.get('/problem/delete', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		if (!user.isAdmin) throw { message: "无权限" }

		var problemId = parseInt(req.query.problemId);

		yield mongo.findOneAndDelete('Problem', { _id: problemId });
	}));
});

//获取题目数据列表
router.get('/samplelist', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
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

		dataFile.sort();

		return { title: dataFile };
	}));
});

//获取题目数据
router.get('/sample', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" };

		var problemId = req.query.problemId;
		var fileName = req.query.fileName;

		var filePath = __dirname + "/problem/" + problemId + "/" + fileName;

		if (!fs.existsSync(filePath)) throw { message: filePath + " 不存在" }

		var text = fs.readFileSync(filePath, 'utf8');

		return { title: text };
	}));
	
});

//添加题目测试数据
router.post('/sample/add', upload.single('file'), function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
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
	if (fs.existsSync(filePath)) {
		err = fs.writeFileSync(filePath, data, 'utf-8');
	} else {
		err = { message: "文件不存在" };
	}

	if (err) throw err;

	return { title: req.baseUrl + req.path };
});





//删除题目测试数据
router.post('/sample/delete', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
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




module.exports = router;
