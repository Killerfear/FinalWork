var _ = require('underscore');



var notEmptyParam =  {};
var requiredParam =  {};
var filter =  {};

var checkList = [notEmptyParam, requiredParam];

exports.Check = function(method, url, param) {
	for (var i = 0; i < checkList.length; ++i) {
		var err = checkList[i][method][url](param);
		if (err) return err;
	}
	return;
}

exports.Filter = function(method, url , param) {
	return filter[method][url](param);
};


