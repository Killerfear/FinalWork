var express = require("express");
var router = express.Router();
var co = require("co");
var fs = require("fs");
var _ = require("underscore");
var multer = require("multer");
var redis = require("../lib/redis-extend");
var upload = multer({dest: "uploads/" });
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
router.get("/samplelist", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" }

		var problemId = req.query.problemId;
		var filePath = path.resolve("problem", problemId.toString());
		var files = yield fs.readdirAsync(filePath);

		if (!_.isArray(files)) throw files;

		var dataFile = [];
		files.forEach(function(file) {
			if (!file.match(/.*\.(in|out)/)) return;
			dataFile.push(file);
		});

		dataFile.sort();

		return { page:"admin-data", file: dataFile };
	}));
});

//获取题目数据
router.get("/sample", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;
		if (!user.isAdmin) throw { message: "无权限" };

		var problemId = req.query.problemId;
		var fileName = req.query.fileName;

		var filePath = path.resolve("problem", problemId, fileName);

		if (!fs.existsSync(filePath)) throw { message: filePath + " 不存在" }

		var text = yield fs.readFileAsync(filePath, "utf8");

		return {
			page: "admin-edit-data",
			fileName: fileName,
			text: text,
			problemId: problemId
		};
	}));

});

//添加题目测试数据
router.post("/sample/add", upload.single("file"), function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var file = req.file;
		console.log(file);
		if (!file) throw { message: "参数缺失" }

		var user = req.user;
		console.log(user);
		if (!user.isAdmin) throw { message: "无权限" }

		var path = './problem/' + req.query.problemId + '/' + file.originalname;
		console.log(path);

		yield fs.renameAsync(file.path, path);

		return { json: {} }
	}));
});

//修改题目测试数据
router.post("/sample/update", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		if (!user.isAdmin) throw { message: "无权限" }

		var problemId = req.body.problemId;
		var fileName = req.body.fileName;
		var data = req.body.data;

		var filePath = path.resolve("problem", problemId, fileName);

		var err;
		if (fs.existsSync(filePath)) {
			yield fs.writeFileAsync(filePath, data, "utf-8");
		} else {
			err = { message: "文件不存在" };
		}

		if (err) throw err;

		res.redirect("back");
	}));
});





//删除题目测试数据
router.get("/sample/delete", function(req, res, next) {
	LogicHandler.Handle(req, res, next, co.wrap(function * () {
		var user = req.user;

		if (!user.isAdmin) throw { message: "无权限" }

		var problemId = req.query.problemId;
		var fileName = req.query.fileName;

		var filePath = path.resolve("problem", problemId, fileName);
		var err = fs.unlinkSync(filePath);

		if (err) throw { message: "删除文件失败", err: err };

		res.redirect('/admin/samplelist?problemId=' + problemId);
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
