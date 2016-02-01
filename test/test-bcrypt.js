
var express = require('express');
var router = express.Router();
var User = require('../lib/user');


/* GET users listing. */

for (var i = 0; i < 100000; ++i) {
  var user = new User({
	username : "jfieicjxyt1",
	password : "93jcnxka39"
  });

  user.hashPassword(function(err) {
	if (err) throw err;
	console.log(i);
  });

}

console.log('finish');


module.exports = router;
