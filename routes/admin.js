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


		var promises = yield [ DB.Problem.find()
														  .sort("problemId")
															.select("-_id title problemId")
															.skip(skip)
															.limit(limit),
													 DB.Problem.count()
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

		problem = new DB.Problem(problem);
		problem = yield problem.save();
		console.log(problem);

		var sampleInput = problem.sampleInput;
		var sampleOutput = problem.sampleOutput;

		var id = problem.problemId;

		var filePath = path.join(__dirname, "../problem/", id.toString());

		yield fs.mkdirAsync(filePath, 600);

		yield [
			fs.writeFileAsync(filePath + "/sample.in", sampleInput, "utf-8"),
			fs.writeFileAsync(filePath + "/sample.out", sampleOutput, "utf-8")
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

		var filePath = path.join(__dirname, "../problem/", problemId.toString());

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

		var problemPath = path.join(__dirname, "../problem", problemId.toString());
		console.log("Deleted Problem Path:", problemPath);
		yield [
			DB.Problem.findOneAndRemove({ problemId: problemId }),
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
			if (size > (1 << 20)) size = (size  >> 20) + " MB";
			else if (size > (1 << 10)) size = (size >> 10)  + " KB";
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

//获取比赛列表
router.get('/contest/list/:page', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var page = parseInt(req.params.page);
		var limit = 50;
		var skip = (page - 1) * limit;
		var contests = yield DB.Contest.find()
													 .skip(skip)
													 .limit(limit)
													 .sort("-contestId")

	  var contestCount = yield redis.getAsync('contestCount');

    return {
			contests: contests,
			contestCount: contestCount
		}
	}));
});

//创建比赛
router.put('/contest', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {

		var contest = new DB.Contest(req.body.contest);

		if (contest.startTime > contest.endTime) throw { message: "开始时间比结束时间晚" };
		if (contest.startTime < 0) throw { message : "开始时间范围不对" };

		var problemIds = req.body.contest.problemId;
		if (problemIds.length > 26) throw { message: "题目数量超过限制" };

		for (var i in problemIds) {
			var problemId = problemIds[i];
			var problem = yield DB.Problem.findOne({ problemId: problemId }, "-_id -isHidden");
			if (!problem) throw { message: "题目 " + problemId + " 不存在" }
			contest.problems.push(problem);
		}

		yield contest.save();
		return {};
	}));
});

//修改比赛
router.post('/contest/data',function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var contest = req.body.contest;
		var doc = yield DB.Contest.findOneAndUpdate({ contestId: contest.contestId }, contest);
		if (!doc) throw { message: "比赛不存在" };
		return {};
	}));
});

//获取比赛数据
router.get('/contest/data', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var contest = yield DB.Contest.findOne({ contestId: parseInt(req.query.contestId) })
																	.select("-_id");
		if (!contest) throw { message: "比赛不存在" };

		contest = contest.toObject();
		var problemId = [];
		for (var i in contest.problems) {
			problemId.push(contest.problems[i].problemId);
		}

		contest.problemId = problemId;
		contest = _.omit(contest, "problems");
		return {
			contest: contest
		}
	}))
})

//删除比赛
router.get('/contest/delete', function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var contestId = parseInt(req.query.contestId);

		yield DB.Contest.findOneAndRemove({ contestId: contestId });

		return {};
	}));
});


module.exports = router;
