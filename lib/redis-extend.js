var redis = require("redis");
var client;


client = redis.createClient();

module.exports = client;


//======= extend function start ========//

client.Get = function(key) {
	return new Promise(function (resolve, reject) {
		client.get(key, function(err, reply) {
			if (err) return reject(err);
			resolve(reply);
		});
	});
}


client.Set = function(key, value) {
	return new Promise(function (resolve, reject) {
		client.set(key, value, function(err, reply) {
			if (err) return reject(err);
			resolve(reply);
		});
	});
}

client.Del = function(key) {
	return new Promise(function (resolve, reject) {
		client.del(key, function(err, reply) {
			if (err) return reject(err);
			resolve(reply);
		});
	});
}

client.Expire = function(key, expire) {
	return client.expire(key, expire);
}


//======= extend function end ========//
