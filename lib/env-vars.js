var c = require('./colors');

var envVars = ['COOKIE_SECRET',
	'SESSION_SECRET',
	'EMAIL'];

envVars.forEach(function(variable, index, list) {
	if (!process.env[variable]) console.warn(c.red + 'Warning: the environment variable ' + variable + ' is not set.' + c.reset)
});
