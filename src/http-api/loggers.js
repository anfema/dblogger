const Result = require('./result');
const getLogger = require('./getLogger');

function singleLogger(ctx) {
	if (!ctx.combinedLogging) {
		const loggers = [];
		let i = 1;

		for (const logger of ctx.loggers) {
			if (i === parseInt(ctx.params.id, 10))
			loggers.push({
				id: i,
				name: logger,
			});

			i += 1;
		}

		ctx.body = new Result(ctx, loggers).serialize('loggers');

		return Promise.resolve();
	}

	return getLogger(ctx)
	.then(logger =>
		logger.model.Logger.findOne({
			where: {
				id: parseInt(ctx.params.id, 10),
			},
		})
	)
	.then((obj) => {
		if (obj === null) {
			ctx.throw(404);

			return;
		}

		ctx.body = new Result(ctx, {
			id: obj.id,
			name: obj.name,
		}).serialize('logger');
	});

}

function loggerList(ctx) {
	if (!ctx.combinedLogging) {
		const loggers = [];
		let i = 1;

		for (const logger of ctx.loggers) {
			loggers.push({
				id: i,
				name: logger,
			});

			i += 1;
		}

		ctx.body = new Result(ctx, loggers).serialize('loggers');

		return Promise.resolve();
	}

	return getLogger(ctx)
	.then(logger =>
		logger.model.Logger.findAll({
			order: 'id ASC',
		})
	)
	.then((rows) => {
		const loggers = [];

		for (const logger of rows) {
			loggers.push({
				id: logger.id,
				name: logger.name,
			});
		}

		ctx.body = new Result(ctx, loggers).serialize('logger');
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleLogger(ctx);
	}

	return loggerList(ctx);
};
