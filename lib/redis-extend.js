var redis = require("redis");
var blueBird = require('bluebird');
var client;

blueBird.promisifyAll(redis);

client = redis.createClient();

console.log("Redis connected");
module.exports = client;

