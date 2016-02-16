var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var redisStore = require('connect-redis')(session);
var csrf = require('csurf');


var routes = require('./routes/index');
var user = require('./routes/user');
var problemset = require('./routes/problemset');
var status = require('./routes/status');
var contest = require('./routes/contest');

var app = express();

console.log(__dirname);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
var hour = 60 * 60 * 1000;

app.use(logger('dev'));
app.use(bodyParser.json({limit : 32 * 1024 /*32kb*/}));
app.use(bodyParser.urlencoded({ extended: false,limit : 1024 * 1024 }));
app.use(bodyParser.raw({ limit : 1024 * 1024 }));
app.use(cookieParser('oiwejopepw;'));
app.use(session({
	secret: 'randomstr',
	store: new redisStore({ prefix: 'sid'}),
	cookie: { httpOnly: true, maxAge: hour * 100 },
	resave: false,
	saveUninitialized: true
}));
//app.use(csrf());

app.use(express.static(path.join(__dirname, 'public')));
/*
app.use(function(req, res, next) { 
	res.locals.csrf = req.csrfToken ? req.csrfToken() : '';
	next();
});
*/

app.use('/', routes);
app.use('/user', user);
app.use('/problemset', problemset);
app.use('/status', status);
app.use('/contest', contest);


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

app.listen(80, function() {
	console.log("Server is listening");
});
