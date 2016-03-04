
var redis = require('bluebird').promisifyAll(require('redis'));
var co = require('co');


co(function * () {
	console.log('Connecting...');
	var client = redis.createClient();
	console.log('OK');
	
	var res = yield client.incrAsync('problemCount', 0);
	return res;
}).then(function(data) {
	console.log("success", data);
}, function(err) {
	console.log("error:", err);
});


