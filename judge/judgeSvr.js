var co = require('co');
var child_process = require('child_process');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var mongo = require('./lib/mongo-extend');
var judge = require('./lib/judge');;

var OJ_PENDING = 0;
var OJ_COMPILE = 1;
var OJ_RUNNING = 2;
var OJ_CE = 2;
var OJ_RE = 3;
var OJ_MLE = 4;
var OJ_TLE = 5;
var OJ_OUTPUTLIMIT = 6;
var OJ_AC = 7;
var OJ_WA = 8;
var OJ_PE = 9;



function compile(srcCode)
{
	child_process.execSync("echo -e \"" + srcCode + "\" > Main.cc");
	var options = {
		timeout: 60 * 1000, //60s
		maxBuffer: 100 * 1024, 	//100KB
		encoding: utf8
	};
	var ce = child_process.execSync("g++ Main.cc -o Main -lm -O3 -DONLINE_JUDGE --static", options);
	return ce;
}

if (cluster.isMaster) {
	//master

	process.chdir(__dirname);
	child_process.execSync("rm -rf run*");

	var workers = [];
	for (var i = 0; i < numCPUs; ++i) {
		workers.push({ worker: cluster.fork(), used: 0});
	}

	var io = require('socket.io')(33445);

	io.on('connect', function(socket) {
		socket.on('judge', function (submit) {
			var worker = _.min(workers, function(data) { return data.used; });
			++worker.used;
			worker.worker.send(submit);
		}));
	});

	cluster.on('message', function(pid) {
		var worker = _.find(workers, function(data) { return data.worker.process.pid == pid });
		--worker.used;
	});
} else {
	//worker

	var workDir = __dirname + "/run" + process.pid;
	child_process.execSync("mkdir " + workDir); 
	process.chdir(workDir);

	process.on('message', co.wrap(function * (submit) {
		yield mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set: { result: OJ_COMPILE } });
		var ce = compile(submit.src);

		if (ce) {
			yield mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set: { result: OJ_CE, ceInfo: ce } });
		} else {
			yield mongo.findOneAndUpdate('Solution', { _id: submit.solutionId }, { $set: { result: OJ_RUNNING });
			var result = judge(workDir, submit.files, submit.memLimit, submit.timeLimit, submit.judgeType);
			yield mongo.findOneAndUpdate('Solution', { _id: submit.solid }, { $set: { result });
		}

		process.send({ pid: process.pid});
	}));
}



