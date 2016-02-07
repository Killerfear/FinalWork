var co = require('co');
var ParamsHandler = require('./param-handler');


exports.Handle = function(page, req, res, next, logic) {
	var url = req.baseUrl + req.path;
	var method = req.method;
	var param = (method == 'PUT' || method == 'POST') ? req.body : req.query;
	console.log('url:', url, 'param:', param);
	co(function * () {
		var err = ParamsHandler.Check(method, url, param);
		if (err) throw err;
		var data = yield logic();
		//data = ParamsHandler.Filter(method, url, data);
		return data;
	}).then(function(data) {
		console.log('success', page, data);
		res.render(page, data);
	}, function(e) {
		next(e);
	});
};

