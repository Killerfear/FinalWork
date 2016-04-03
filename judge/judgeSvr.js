var co = require('co');
var _ = require('underscore');
var child_process = require('child_process');
var fs = require('fs');
var cluster = require('cluster');
var numCPUs = 1;//require('os').cpus().length;
var mongo = require('../lib/mongo-extend');
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

var OJ_RESULT = ['Pending', 'Compiling', 'Runing', 'Compile Error', 'Runtime Error', 'Memory Limit Exceed', 'Time Limit Exceed', 'Output Limit Exceed', 'Accept', 'Wrong Answer', 'Presentation Error' ];


var compile = co.wrap(function * (srcCode) {
	//child_process.execSync("echo -e \"" + srcCode + "\" > Main.cc");
	yield fs.writeFileAsync("Main.cc", srcCode, { encoding: "utf8" });
	var options = {
		timeout: 60 * 1000, //60s
		maxBuffer: 100 * 1024, 	//100KB
		encoding: "utf8"
	};
	var res  = yield new Promise(function(resolve, reject) {
		child_process.exec("g++ -Wall -Werror Main.cc -o Main -lm -O3 -DONLINE_JUDGE --static", function(err, stdout, stderr) {
			resolve(stderr.toString());
		});
	});
	
	return res;
});

if (cluster.isMaster) {
	//master

	process.chdir(__dirname);
	//child_process.execSync("rm -rf run*");

	var workers = [];
	for (var i = 0; i < numCPUs; ++i) {
		workers.push({ worker: cluster.fork(), used: 0});
	}

	var io = require('socket.io')(33445);

	io.on('connect', function(socket) {
		console.log("connected....");
		socket.on('judge', function (submit) {
			console.log("judging....");
			var worker = _.min(workers, function(data) { return data.used; });
			++worker.used;
			worker.worker.send(submit);
		});
	});

	cluster.on('message', function(resp) {
		var pid = resp.pid;
		console.log(pid, ":", "finish");
		console.log(workers);
		var worker = _.find(workers, function(data) { return data.worker.process.pid == pid; });
		--worker.used;
	});
} else {
	//worker
	var workDir = __dirname + "/run" + process.pid;
	child_process.execSync("mkdir " + workDir); 
	process.chdir(workDir);

	process.on('message', co.wrap(function * (submit) {
		var fullPath = __dirname + "/../problem/" + submit.problemId;
		var user = submit.user;
		
		console.log(submit.problemId);
		var problemInfo = yield mongo.findOne("Problem", { _id: submit.problemId });
		console.log(problemInfo);
		submit.memLimit = problemInfo.memLimit;
		submit.timeLimit = problemInfo.timeLimit;
		yield mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set: { result: OJ_RESULT[OJ_COMPILE] } });
		var ce = yield compile(submit.srcCode);

		if (ce) {
			yield mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set: { result: OJ_RESULT[OJ_CE], ceInfo: ce } });
		} else {
			var wait = mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set: { result: OJ_RESULT[OJ_RUNNING] } });
			console.log("Start Judging");
			var judgeResult = judge.judge(workDir, fullPath, submit.memLimit, submit.timeLimit, submit.judgeType);
			judgeResult.result = OJ_RESULT[judgeResult.result];
			console.log("Judge finish");
			console.log("result:", judgeResult);


			yield wait;
			wait = [];
			wait.push(mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set:  judgeResult  }));
			
			if (judgeResult.result == OJ_RESULT[OJ_AC]) {
				wait.push(mongo.findOneAndUpdate('User', { _id: user._id }, { $addToSet: { solved: submit.problemId } }));
			}

			yield wait;
		}

		process.send({ pid: process.pid});
	}));
}



