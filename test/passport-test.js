var passport = require('passport');
var User = require('../lib/user');

passport.use(new BasicStrategy(
	function(username, password, done) {
		User.findOne({ username: username }, function(err, user) {
			if (err) { return done(err); }
			if (!user) { return done(null, false); }
			if (!user.validPassword(password)) { return done(null, false); }
			return done(null, user);
		});
	}
));







