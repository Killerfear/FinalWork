var log = require('./logger.js');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://127.0.0.1:27017/OJ";
var co = require("co");
var _ = require("underscore");
var ObjectId = require("mongodb").ObjectId;

//======= extend function start ========//
var db;

co(function * () {
	return yield MongoClient.connect(url);
}).then(function(db) {
	db = db;
	console.log("Mongo is connected");
}, function(err) {
	console.log("Mongo error:", err);
});

exports.find = co.wrap(function*(collection,query,extend){
    if(!collection){
        return Promise.reject(log.CommonError(405,"查询数据库时，参数缺失"));
    }
    query = query ? query:{};
    extend = extend? extend :{};
    var _extend = _.defaults(extend,{limit:20,skip:0,select:{},sort:{}});
    _extend.limit = parseInt(_extend.limit);
    _extend.skip = parseInt(_extend.skip);

    var collection = db.collection(collection);
    var docs = yield collection.find(query,_extend.select).sort(_extend.sort).limit(_extend.limit).skip(_extend.skip).toArray();
    return docs;
});

exports.findAndCount = co.wrap(function*(collection,query){
    if(!collection){
        return Promise.reject(log.CommonError(405,"查询数据库时，参数缺失"));
    }
    query = query ? query:{};

    var collection = db.collection(collection);
    var count = yield collection.find(query).count();

    return count; 
});


exports.findOneAndUpdate = co.wrap(function*(collection,query,update,extra){
    var collection = db.collection(collection);
    var docs = yield collection.findOneAndUpdate(query,update,extra);
    return docs;
});


exports.aggregate = co.wrap(function*(collection, objArr){
    if(!collection){
        return Promise.reject(500,"传入的数据表为空");
    };
    var collection = db.collection(collection);
    var docs = yield collection.aggregate(objArr).toArray();
    return docs;
    
    
});

exports.findOne = co.wrap(function*(collection,query,extend){
    extend = extend? extend :{};
    var _extend = _.defaults(extend,{limit:1,skip:0,select:{},sort:{}});
    var docs = yield exports.find(collection,query,_extend);
    return docs.length>0? docs[0] : null;
});





exports.updateOne = co.wrap(function*(collection, query, update){
    if (!collection) {
        return {};
    }
    query = query?query:{};
    update = update?update:{};
    console.log(update);
    var collection = db.collection(collection);
    var result = yield collection.updateOne(query, update);
    return result;
});

exports.addOne = co.wrap(function*(collection, obj){
    if (!collection) {
        return {};
    }
    obj = obj?obj:{};
    var collection = db.collection(collection);
    var result = yield collection.insert(obj);
    return result;
});


