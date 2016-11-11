const Result = require('./result');
const getLogger = require('./getLogger');

function singleTag(ctx) {
	return getLogger(ctx)
	.then(logger =>
		logger.model.Tag.findOne({
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
		}).serialize('tag');
	});
}

function tagList(ctx) {
	const tags = [];
	let offset = 0;

	if (ctx.query.page) {
		offset = ctx.query.page * ctx.limit;
	}

	return getLogger(ctx)
	.then(logger =>
		logger.model.Tag.findAndCountAll({
			order: 'id ASC',
			offset,
			limit: ctx.limit,
		})
	)
	.then(({ count, rows }) => {
		for (const tag of rows) {
			tags.push({
				id: tag.id,
				name: tag.name,
			});
		}

		ctx.body = new Result(ctx, tags, offset, count).serialize('tag');
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleTag(ctx);
	}

	return tagList(ctx);
};

