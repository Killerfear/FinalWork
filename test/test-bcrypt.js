
var express = require('express');
var router = express.Router();
var User = require('../module/user');
var _ = require('underscore');

var x = 111;
x = parseInt(x);
console.log(x);
console.log(_.isEmpty(x));

x = 0;
console.log(_.isEmpty(x));



