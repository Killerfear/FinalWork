var router = require('express').Router();
var co = require('co');

var LogicHandler = require('../lib/logic-handler');


router.get('/problem', function(req, res, next) {
	LogicHandler.handle(, req, next, co.wrap(function * () {

	}));
});

router.put('/edit/description', function(req, res, next) {
	
});

router.post('/edit/description', function(req, res, next) {
	
});

router.delete('/edit/description', function(req, res, next) {
	
});

