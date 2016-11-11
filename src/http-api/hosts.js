const Result = require('./result');
const getLogger = require('./getLogger');

function singleHost(ctx) {
	return getLogger(ctx)
	.then(logger =>
		logger.model.Hostname.findOne({
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
		}).serialize('host');
	});
}

function hostList(ctx) {
	const hosts = [];
	let offset = 0;

	if (ctx.query.page) {
		offset = ctx.query.page * ctx.limit;
	}

	return getLogger(ctx)
	.then(logger =>
		logger.model.Hostname.findAndCountAll({
			order: 'id ASC',
			offset,
			limit: ctx.limit,
		})
	)
	.then(({ count, rows }) => {
		for (const host of rows) {
			hosts.push({
				id: host.id,
				name: host.name,
			});
		}

		ctx.body = new Result(ctx, hosts, offset, count).serialize('host');
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleHost(ctx);
	}

	return hostList(ctx);
};

