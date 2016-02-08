var _ = require('underscore');
var fs = require('fs');


var filter =  {};

var ParamList = {};

var checkType = {
	required: function (param, attrs) {
				for (var i = 0; i < attrs.length; ++i) {
					if (!_.has(param, attrs[i])) return { message: "参数缺失" }
				}
				return;
			  },
			  
	notEmpty: function (param, attrs) {
				for (var i = 0; i < attrs.length; ++i) {
					if (_.isString(attrs[i]) && _.isEmpty(attrs[i])) return { message: "参数不能为空串" }
				}
				return;
			  } 
} 

var lastModified = 0;

function initConfig() {

	var stat = fs.statSync('./lib/param-handler.conf');

	var mod = stat.mtime.getTime();

	if (mod <= lastModified) return;

	lastModified = mod;

	var content = fs.readFileSync('./lib/param-handler.conf', 'utf-8');
	content = content.split('\n');

	var state = 0;
	var url, method;

	ParamList = {};
	filter = {};

	for (var i = 0; i < content.length; ++i) {
		content[i] = content[i].replace(/\s+$/g, '');
		if (content[i].length == 0) continue;

		var depth = _.findIndex(content[i], function(ch) { return ch != '\t' });

		if (depth == 0) url = content[i].trim();
		else if (depth == 1) method = content[i].trim();
		else {
			var buffer = content[i].trim();
			buffer = buffer.split(/:\s*/);
			var fn = buffer[0];
			var attrs = buffer[1].split(/\s+/);


			if (fn == 'filter') {
				if (!filter[url]) filter[url] = { };
				if (!filter[url][method]) filter[url][method] = { };
				filter[url][method] = attrs;
			} else {
				if (!ParamList[url]) ParamList[url] = { };
				if (!ParamList[url][method]) ParamList[url][method] = {};
				ParamList[url][method][fn] = attrs;
			}
		}
	}

	console.log(ParamList);
}


//initConfig();

exports.Check = function(method, url, param) {

	initConfig();

	for (var type in checkType) {
		var check = checkType[type];
		if (!check || !ParamList[url] || !ParamList[url][method]) continue;

		var attrs = ParamList[url][method][type];
		if (!attrs) continue;


		var err = check(param, attrs);
		if (err) return err;
	}

	console.log("Param Pass");
	return;
}

exports.Filter = function(method, url , param) {
	var keep = _.keys(param);
	if (filter[url] && filter[url][method]) keep = filter[url][method];
	return _.pick(param, keep);
};


