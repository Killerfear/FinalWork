var co = require('co');
var ParamsHandler = require('./param-handler');
var User = require('../module/user');




exports.Handle = function(req, res, next, logic) {
	var url = req.baseUrl + req.path;
	var method = req.method;
	var param = method == 'POST' ? req.body : req.query;

	req.ip = req.connection.remoteAddress;
	console.log(req.ip);

	console.log(req.sessionID);
	console.log('url:', url, 'param:', param);

	co(function * () {
		//var err = ParamsHandler.Check(method, url, param);
		//if (err) throw err;

		req.user = yield User.getBySession(req.session);
		console.log(req.user);
		if (url == '/user/login') {
//			if (req.user) res.redirect('/problemset');
		} else if (!req.user && url != '/user/logout' && url != '/user/signup') {
			res.redirect('/user/login');
		}

		var data = yield logic();
		//data = ParamsHandler.Filter(method, url, data);
		return data;
	}).then(function(data) {
		console.log('success', data);
		if (req.user) {
			data.username = req.user.username;
			if (req.user.isAdmin) data.isAdmin = true;
		}
		res.json(data.json);
	}, function(e) {
		next(e);
	});
};
