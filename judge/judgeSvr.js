'use strict'


var co = require('co');
var _ = require('lodash');
var child_process = require('child_process');
var fs = require('fs');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var mongo = require('../lib/mongo-extend');
var DB = require('../lib/mongoose-schema');
var judge = require('../judge/build/Release/judge');
var bluebird = require('bluebird');

bluebird.promisifyAll(child_process);
bluebird.promisifyAll(fs);

var OJ_PENDING = 0;
var OJ_COMPILE = 1;
var OJ_RUNNING = 2;
var OJ_CE = 3;
var OJ_RE = 4;
var OJ_MLE = 5;
var OJ_TLE = 6;
var OJ_OUTPUTLIMIT = 7;
var OJ_AC = 8;
var OJ_WA = 9;
var OJ_PE = 10;

var OJ_RESULT = require('../lib/global').OJ_RESULT;


var compile = function * (srcCode) {
	//child_process.execSync("echo -e \"" + srcCode + "\" > Main.cc");
	console.log('compiling');
	fs.writeFileSync("Main.cc", srcCode, { encoding: "utf8" });
	console.log('writeFileAsync');
	var options = {
		timeout: 60 * 1000, //60s
		maxBuffer: 100 * 1024, 	//100KB
		encoding: "utf8"
	};

	return new Promise(function(resolve, reject) {
			if (fs.existsSync("Main")) {
				fs.unlinkSync("Main");
			}
			console.log("exec");
			child_process.exec("g++ -Wall -std=c++11 Main.cc -o  Main -lm -O2 -DONLINE_JUDGE --static", function(err, stdout, stderr) {
				if (fs.existsSync("Main")) {
					resolve("");
				}
				resolve(stderr);
			});
		});
};

if (cluster.isMaster) {
	//master

	process.chdir(__dirname);
	console.log(__dirname);
	child_process.execSync("rm -rf run*");

	var workers = [];
	for (var i = 0; i < numCPUs; ++i) {
		workers.push({ worker: cluster.fork(), used: 0});
	}

	var io = require('socket.io')(33445);

	io.on('connect', function(socket) {
		console.log("connected....");
		socket.on('judge', function (submit) {
			console.log("judging....");
			var worker = _.minBy(workers, function(data) { return data.used; });
			//console.log(worker);
			++worker.used;
			worker.worker.send(submit);
		});
	});

	cluster.on('message', function(resp) {
		if (resp.pid) {
			var pid = resp.pid;
			console.log(pid, ":", "finish");
			//console.log(workers);
			var worker = _.find(workers, function(data) { return data.worker.process.pid == pid; });
			--worker.used;
		}
	});
} else {
	//worker
	//require('../app.js');
	var workDir = __dirname + "/run" + process.pid;
	child_process.execSync("mkdir " + workDir);
	process.chdir(workDir);

	process.on('message', co.wrap(function * (submit) {
		child_process.execSync("rm -f Main data.in error.out Main.cc user.out");

		var fullPath = __dirname + "/../problem/" + submit.problemId;
		var user = submit.user;

		console.log(submit.problemId);

		console.log("1");
		console.log(submit);
		var solution = yield DB.Solution.findOne({ solutionId: submit.solutionId });
		solution.result = OJ_COMPILE;

		console.log("2");

		var ce = yield [compile(submit.srcCode), solution.save()][0];
			console.log(ce);

		if (ce) {
			solution.result = OJ_CE;
			solution.error = ce;
			yield solution.save();

		} else {
			solution.result = OJ_RUNNING;
			yield solution.save();

			console.log("Start Judging");
			var judgeResult = judge.judge(workDir, fullPath, submit.memLimit, submit.timeLimit, submit.judgeType);

			console.log("Judge finish");
			console.log("result:", judgeResult);

			solution = _.assign(solution, judgeResult);
			console.log(solution);
			var wait = [];
			wait.push(solution.save());

			var pos;
			if (judgeResult.result == OJ_AC &&
				user.solved[pos = _.sortedIndex(user.solved, submit.problemId)] != submit.problemId) {
				console.log(pos);
				user.solved.splice(pos, 0, submit.problemId);
				wait.push(DB.User.findOneAndUpdate({ username : user.username }, { solved: user.solved }));
				wait.push(DB.Problem.findOneAndUpdate({ problemId: submit.problemId }, { $inc: { solvedNum: 1 }}));
			}

			yield wait;
		}

		process.send({ pid: process.pid});
	}));
}
