var express = require("express");
var router = express.Router();
var co = require("co");
var fs = require("fs");
var _ = require("underscore");
var multipart = require('connect-multiparty');

/*
var multer = require("multer");
var upload = multer({dest: "uploads/" });
*/
var redis = require("../lib/redis-extend");
var bluebird = require("bluebird");
var path = require("path");
var child_process = require("child_process");

var User = require("../module/user");
var LogicHandler = require("../lib/logic-handler");
var DB = require("../lib/mongoose-schema");

bluebird.promisifyAll(fs);
bluebird.promisifyAll(child_process);

router.get("*", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) return next({ message: "无权限" });
		next();
	}));
});

//管理员主页 类似题目列表页面
router.get("/problem/list/:page", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var page = parseInt(req.params.page);
		var skip = 50 * (page - 1);
		var limit = 50;

		console.log("find");

		var promises = yield [

		]

		var promises = yield [ DB.Problem.find()
														  .sort("problemId")
															.select("title problemId")
															.skip(skip)
															.limit(limit),
													 redis.getAsync('problemCount')
												]

		var problems = promises[0];
		var problemCount = promises[1];


		console.log("return");

		return {
			result: "success",
			problems: problems,
			problemCount: problemCount
		}
	}));
});

//题目编辑页面
router.get("/problem/edit", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problem = { };
		var title = "添加题目";
		if (req.query.problemId) {
			problem = yield mongo.findOne("Problem", { _id: parseInt(req.query.problemId) });
			title = "编辑题目"
		}

		return {
			page: "admin-edit",
			title: title,
			username: req.user.username,
			details: problem
		};
	}));
});


router.get('/problem/data', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problemId = parseInt(req.query.problemId);
		var problem = yield DB.Problem.findOne({ problemId: problemId })
																  .select('-_id problemId title timeLimit memLimit isHidden description input output sampleInput sampleOutput');
		return {
			problem: problem
		}
	}));
});

//新增题目描述
router.post("/problem/add", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problem = req.body.problem;

		var sampleInput = problem.sampleInput;
		var sampleOutput = problem.sampleOutput;

		var id = yield redis.incrAsync("problemCount");
		console.log(id);

		var filePath = path.join("./problem/", id.toString());

		yield fs.mkdirAsync(filePath, 600);

		yield [
			fs.writeFileAsync(filePath + "/sample.in", sampleInput, "utf-8"),
			fs.writeFileAsync(filePath + "/sample.out", sampleOutput, "utf-8"),
			(new DB.Problem(problem)).save()
		]

		return {};
	}));
});

//修改题目描述
router.post("/problem/update", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {

		console.log("Start");
		var problem = req.body.problem;

		var problemId = parseInt(problem.problemId);
		if (problemId != problem.problemId) throw { message: "参数不合法" }

		console.log(problem);
		console.log('problemId:', problemId);
		var updateRes = yield DB.Problem.findOneAndUpdate({ problemId: problemId }, problem);
		console.log(updateRes);

		var filePath = path.join("./problem/", problemId.toString());

		yield [
			fs.writeFileAsync(filePath + "/sample.in", problem.sampleInput, "utf-8"),
			fs.writeFileAsync(filePath + "/sample.out", problem.sampleOutput, "utf-8")
		]

		return {};
	}));
});

//删除题目描述
router.get("/problem/delete", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problemId = parseInt(req.query.problemId);
		if (problemId.toString() != req.query.problemId) {
			return next({message : "problemId 参数有误" })
		}

		var problemPath = path.join(__dirname, "/../problem", problemId.toString());
		console.log("Deleted Problem Path:", problemPath);
		yield [
			DB.Problem.findOneAndDelete({ problemId: problemId }),
			child_process.execAsync("rm -rf "+ problemPath)
		]
		return {
			result: "success"
		}
	}));
});

//获取题目数据列表
router.get("/problem/data/list", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problemId = req.query.problemId;
		if (problemId != parseInt(problemId).toString()) {
			throw { message: "problemId 参数不对" };
		}

		var filePath = path.join(__dirname, "../problem", problemId);
		console.log("filePath:", filePath);
		var files = yield fs.readdirAsync(filePath);

		if (!_.isArray(files)) throw files;

		var dataFile = [];
		files.forEach(function(file) {
			if (!file.match(/.*\.(in|out)/)) return;
			dataFile.push(file);
		});

		dataFile.sort();

		for (var i in dataFile) {
			var name = dataFile[i];
			filePath = path.join(__dirname, "../problem", problemId, name);
			var fileStat = yield fs.lstatAsync(filePath);

			var size = fileStat.size;
			if (size > (1 << 20)) size = (size / (1 << 20)) + " MB";
			else if (size > (1 << 10)) size = (size / 1024) + " KB";
			else size = size + " B";
			dataFile[i] = { fileName: name, fileSize: size };
		}

		return {
			files: dataFile
		}
	}));
});

//获取题目数据
router.get("/problem/testdata", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var problemId = req.query.problemId;
		var fileName = req.query.fileName;

		var filePath = path.join(__dirname, "../problem", problemId, fileName);

		if (!fs.existsSync(filePath)) throw { message: filePath + " 不存在" }

		var text = yield fs.readFileAsync(filePath, "utf8");

		return {
			data: {
				fileName: fileName,
				text: text,
				problemId: problemId
			}
		};
	}));

});

//添加题目测试数据
router.post("/problem/testdata/upload", multipart(), function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var files = req.files.file;
		console.log(files);
		if (!files || files.length == 0) throw { message: "参数缺失" }
		console.log("OK");

		var basePath = path.join(__dirname, "../problem", req.query.problemId);
		console.log(basePath);
		for (var i in files) {
			var file = files[i];
			var filePath = path.join(basePath, file.originalFilename);
			console.log(filePath);
			var data = yield fs.readFileAsync(file.path);
			yield [ fs.writeFile(filePath, data), fs.unlink(file.path) ];
		}

		return {};
	}));
});

//修改题目测试数据
router.post("/problem/testdata", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		console.log(req.body);
		var problemId = req.body.data.problemId;
		var fileName = req.body.data.fileName;
		var data = req.body.data.text;

		console.log("zzz");
		if (parseInt(problemId).toString() != problemId) throw { message: "problemId 参数错误" };
		if (!fileName.match(/^[^/]*.(in|out)$/)) throw { message: "fileName 参数错误" }

		var filePath = path.join(__dirname, "../problem", problemId, fileName);
		console.log(filePath);

		console.log("yyy");
		if (!fs.existsSync(filePath))  throw { message: "文件不存在" }

		yield fs.writeFileAsync(filePath, data, "utf-8");

		return {};
	}));
});





//删除题目测试数据
router.delete("/problem/testdata", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {

		var problemId = req.query.problemId;
		var fileName = req.query.fileName;

		if (parseInt(problemId).toString() != problemId) throw { message: "problemId 参数错误" };
		if (!fileName.match(/^[^/]*.(in|out)$/)) throw { message: "fileName 参数错误" }

		var filePath = path.join(__dirname, "../problem", problemId, fileName);
		yield fs.unlinkAsync(filePath);

		return {};
	}));
});


/*******************************比赛相关*********************************/

//获取比赛数据
router.get('/contest/list', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var contests = yield mongo.find("Contest", {});
		return {
			json: {
				contests: contests
			}
		}
	}));
});

//创建比赛
router.post('/contest/edit', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {

		var param = req.body;
		var contest = _.pick(param, 'title', 'problemId', 'isPrivate', 'startTime', 'endTime', 'isHidden', 'authorizee');

		yield mongo.insert('Contest', contest);

		return { title: req.baseUrl + req.path };
	}));
});

//编辑比赛
router.post('/contest/edit/update',function(req, res, next) {
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
router.get('/contest/edit/delete', function(req, res, next) {
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
