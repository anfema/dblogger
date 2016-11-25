const Result = require('./result');
const getLogger = require('./getLogger');

function singleLocation(ctx) {
	return getLogger(ctx)
	.then(logger =>
		logger.model.Func.findOne({
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
			line: obj.line,
			file: obj.sourceID,
		}).serialize('location');
	});
}

function locationList(ctx) {
	const locations = [];
	let offset = 0;
	const where = {};

	if (ctx.query.page) {
		offset = ctx.query.page * ctx.limit;
	}

	if (ctx.query.file) {
		where.sourceID = ctx.query.file;
	}

	return getLogger(ctx)
	.then(logger =>
		logger.model.Func.findAndCountAll({
			where,
			order: 'id ASC',
			offset,
			limit: ctx.limit,
		})
	)
	.then(({ count, rows }) => {
		for (const loc of rows) {
			locations.push({
				id: loc.id,
				name: loc.name,
				line: loc.line,
				file: loc.sourceID,
			});
		}
		ctx.body = new Result(ctx, locations, offset, count).serialize('location');
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleLocation(ctx);
	}

	return locationList(ctx);
};

