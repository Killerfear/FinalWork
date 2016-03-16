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
		if (url == '/user/login') {
//			if (req.user) res.redirect('/problemset');
		} else if (!req.user && url != '/user/logout' && url != '/user/signup') {
			res.redirect('/user/login');
		}

		var data = yield logic();
		//data = ParamsHandler.Filter(method, url, data);
		return data;
	}).then(function(data) {
		data.username = req.user.username;
		console.log('success', data.page, data);
		res.render(data.page, data);
		res.end();
	}, function(e) {
		next(e);
	});
};

