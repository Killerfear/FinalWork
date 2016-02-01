var co = require('co');
var ParamsHandler = require('param-handler');


exports.Handle = function(req, next, logic) {
	var url = req.baseUrl + req.path;
	var method = req.method;
	var param = (method == 'PUT' || method == 'POST') ? req.body : req.query;
	co(function * () {
		var err = ParamsHandler.Check(method, url, param);

		if (err) throw err;

		var data = yield logic();
		data = ParamsHandler.Filter(method, url, data);
	}).then(function(data) {
		res.json({
			result: "success",
			data: data
		});
	}, function(e) {
		next(e);
	});
});

