var co = require('co');
var _ = require('lodash');
var ParamsHandler = require('./param-handler');
var User = require('../module/user');




exports.Handle = function(req, res, next, logic) {
	var url = req.baseUrl + req.path;
	var method = req.method;
	var param =  _.assign({}, req.body, req.query, req.params);

	req.ip = req.connection.remoteAddress;
	console.log(req.ip);

	//console.log(req.sessionID);
	//console.log(req.session);
	console.log('url:', url, 'param:', param);

	co(function * () {
		//var err = ParamsHandler.Check(method, url, param);
		//if (err) throw err;

		req.user = yield User.getBySession(req.session);
		//console.log(req.user);
		if (!req.user) {
			//if (method == 'POST') {
			//	res.redirect('/user/login');
			//}
			req.user = {};
		} else {
			if (_.find(url, '/user/login') == 0) res.redirect(/#/problem/list);
		}

		var data = yield logic();
		//data = ParamsHandler.Filter(method, url, data);
		return data;
	}).then(function(data) {
		console.log('success', data);
		if (req.user && req.user.username) {
			data.username = req.user.username;
			if (req.user.isAdmin) data.isAdmin = true;
		}
		//console.log('response:', data);
		res.json(data);
	}, function(e) {
		next(e);
	});
};
