var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function(req, res, next) {
	res.render('index')
})

/* Get Problem page. */
router.get('/problem/list', function(req, res, next) {
	res.render('index');
})

/* Get Problem Detail */
router.get('/problem/show/:problemId', function(req, res, next) {
	res.render('index');
})

/* Get Status List */
router.get('/status/list', function(req, res, next) {
	res.render('/index');
})


/* Get View Page */
router.get('/views/:page', function(req, res, next) {
	res.render(req.params.page);
})


module.exports = router;
