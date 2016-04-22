var xml2js = require('xml2js');
var co = require('co');
var fs = require('fs');
var querystring = require('querystring');
var bluebird = require('bluebird');
var http = require('http');
var _ = require('lodash');
var DB = require('../lib/mongoose-schema');

bluebird.promisifyAll(fs);
bluebird.promisifyAll(xml2js);
bluebird.promisifyAll(http);

/*
 * [ 'title',
 *   'time_limit',
 *   'memory_limit',
 *   'description',
 *   'input',
 *   'output',
 *   'sample_input',
 *   'sample_output',
 *   'test_input',
 *   'test_output',
 *   'hint',
 *   'source',
 *   'solution' ]
 *
 */
var AddProblem = co.wrap(function * (problem) {
	return new Promise(function(resolve, reject) {
		
		problem['timeLimit'] = problem['time_limit'];
		problem['memLimit'] = problem['memory_limit'];
		problem['sampleInput'] = problem['sample_input'];
		problem['sampleOutput'] = problem['sample_output'];
		problem['isHidden'] = false;
		delete problem.test_input;
		delete problem.test_output;
		delete problem.solution;
		var body = {
			problem: problem
		}
		var postData = JSON.stringify(body);
		console.log(postData);

		var options = {
			path: "/admin/problem/add",
			method: "POST",
			
			headers: {
				"Host": "localhost",
				"Connection": "keep-alive",
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData, 'utf8'),
				"Accept": "application/json, text/plain, */*",
				"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36",
				"Referer": "http://localhost/",
				"Accept-Encoding": "gzip, deflate, sdch",
				"Accept-Language": "zh-CN,zh;q=0.8",
				"Cookie": "connect.sid=s%3AxjEXa9tPgbQvzZjkMNBaZDt8l8-pwpca.xlxOte34w%2Bh1wQ26FsxGthz0QQi3%2BpdeXEUhzvV2gn8",
			}
		}

		var req = http.request(options, function(res) {
			var resData = "";
			res.setEncoding('utf8');
			res.on('data', function(chunk) {
				resData += chunk;
			});
			res.on('end', function() {
				console.log(resData);
				var data = JSON.parse(resData);
					resolve(data);
			});
		});

		req.write(postData);
		req.end();
	});
});

co(function * () {
	var files = yield fs.readdirAsync('../../parseProblem');
	flag = false;
	for (var i in files) {
		var file = files[i];
		if (!file.match(/problem*/)) continue;
		if (file == 'problem2438') flag = true;
		if (!flag) continue;
		var xml = yield fs.readFileAsync('../../parseProblem/' + file, "utf8");

		var js = yield xml2js.parseStringAsync(xml, { ignoreAttrs : true, explicitArray: false  });
		//console.log(js);
		js = js.fps.item;
		if (js.img) continue;
		if (js.spj) continue;
		console.log("addProblem", file);
		//console.log(_.keys(js));
		//console.log(js.sample_output);
		var response = yield AddProblem(js);
		console.log(response);
		//


	}
}).then(function(data) {
	console.log("result:", data);
}, function(err) {
	console.log("error:", err);
});
