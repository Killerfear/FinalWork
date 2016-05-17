var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var redisStore = require('connect-redis')(session);
var csrf = require('csurf');
var ejs = require('ejs');
var cluster = require('cluster');
var child_process = require('child_process');
var process = require('process');
var numCPUs = require('os').cpus().length;


var routes = require('./routes/index');
var user = require('./routes/user');
var problemset = require('./routes/problem');
var status = require('./routes/status');
var contest = require('./routes/contest');
var admin = require('./routes/admin');



var app = express();

//console.log(__dirname);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
var hour = 60 * 60 * 1000;

app.use(logger('dev'));
app.use(bodyParser.json({limit : 2 * 1024 * 1024} /*2mb}*/));
app.use(bodyParser.urlencoded({ extended: false,limit : 2 * 1024 * 1024 }));
app.use(bodyParser.raw({ limit : 2 * 1024 * 1024 }));
app.use(cookieParser('oiwejopepw;'));
app.use(session({
	secret: 'randomstr',
	store: new redisStore({ prefix: 'sid'}),
	cookie: { httpOnly: true, maxAge: hour * 5 },
	resave: false,
	saveUninitialized: true
}));
//app.use(csrf());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, 'public', 'bower_components')))
/*
app.use(function(req, res, next) {
	res.locals.csrf = req.csrfToken ? req.csrfToken() : '';
	next();
});
*/

app.use('/', routes);
app.use('/user', user);
app.use('/problem', problemset);
app.use('/status', status);
app.use('/contest', contest);
app.use('/admin', admin);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



module.exports = app;

/*
app.listen(8080, function() {
	console.log("pid[" + process.pid + "]" + " Server is listening");
});
*/

if (cluster.isMaster) {
	for (var i = 0; i < numCPUs; ++i) {
		cluster.fork();
	}

} else if (cluster.isWorker) {
	app.listen(8080, function() {
		console.log("pid[" + process.pid + "]" + " Server is listening");
	});
}
