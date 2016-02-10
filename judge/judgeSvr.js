var co = require('co');
var exec = require('bluebird').promisify(require('child_process').exec);
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var mongo = require('./lib/mongo-extend');
var judge = require('./lib/judge');;

if (cluster.isMaster) {
	//master
	var workers = [];
	for (var i = 0; i < numCPUs; ++i) {
		workers.push({ worker: cluster.fork(), used: 0});
	}

	var io = require('socket.io')(33445);

	io.on('connect', function(socket) {
		socket.on('judge', co.wrap(function * (submit) {
			var worker = _.min(workers, function(data) { return data.used; });
			++worker.used;

			var solId = yield mongo.findOneAndUpdate('Stat', { name: 'solution' }, { $inc: {count : 1 }});
			solId = solId.count;

			var solution = { 
				date: new Date().getTime(), 
				result: 0, 
				username: submit.username, 
				_id: solId
			}
			
			yield mongo.addOne('Solution', solution);
			submit.solid = solId;
			worker.worker.send(submit);
		}));
	});

	cluster.on('message', function(pid) {
		var worker = _.find(workers, function(data) { return data.worker.process.pid == pid });
		--worker.used;
	});
} else {
	//worker
	process.on('message', co.wrap(function * (submit) {
		var result = judge(submit.src, submit.problemId, submit.judgeType);

		yield mongo.findOneAndUpdate('Solution', { _id: submit.solid }, { $set: { result });
		process.send({ pid: process.pid});
	}));
}



