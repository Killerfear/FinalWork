
var express = require('express');
var router = express.Router();
var _ = require('underscore');
var co = require('co');
var sys = require('util');
var exec = require('child_process').exec;
var crypto = require('crypto');
var net = require('net');
var bluebird = require('bluebird');
var process = bluebird.promisifyAll(require('child_process'));
var io = require('socket.io')(12345);

co(function * () {
	console.log('exec');
	var promises = [];
	for (var i = 0; i < 10; ++i) {
		promises.push(process.execAsync('./a.out'));
	}

	yield promises;
	console.log(promises);
	console.log(res);
	return res;
}).then(function(data) {
	console.log('success', data);
}, function(err) {
	console.log('err', err);
});
