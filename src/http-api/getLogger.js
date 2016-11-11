const createLogger = require('../bunyan-logger');

module.exports = function (ctx) {
	let logger;

	if (!ctx.loggers.has(ctx.query.logger) && !ctx.combinedLogging) {
		ctx.throw(404);
	}

	if (ctx.combinedLogging) {
		logger = createLogger('default');
	} else {
		logger = createLogger(ctx.query.logger);
	}

	return logger;
};

