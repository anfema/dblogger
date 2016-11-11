const Result = require('./result');
const getLogger = require('./getLogger');

module.exports = ctx =>
	getLogger(ctx)
	.then(logger =>
		logger.model.Log.findOne({
			order: 'time ASC',
			limit: 1,
		}).then(first => ({ logger, first }))
	)
	.then(({ logger, first }) =>
		logger.model.Log.findOne({
			order: 'time DESC',
			limit: 1,
		})
		.then(last => ({ first, last }))
	)
	.then(({ first, last }) => {
		const range = {
			id: 1,
			from: new Date(first.time),
			to: new Date(last.time),
		};

		ctx.body = new Result(ctx, range).serialize('timerange');
	});

