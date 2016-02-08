var co = require('co');
var ParamsHandler = require('./param-handler');
var User = require('../module/user');




exports.Handle = function(page, req, res, next, logic) {
	var url = req.baseUrl + req.path;
	var method = req.method;
	var param = method == 'POST' ? req.body : req.query;

	console.log(req.sessionID);
	console.log('url:', url, 'param:', param);

	co(function * () {
		var err = ParamsHandler.Check(method, url, param);
		if (err) throw err;

		if (req.baseUrl != '/user') {
			console.log(req.session);
			req.user = yield User.getBySession(req.session);
			if (!req.user) throw { message : "会话失效" };
		}

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

