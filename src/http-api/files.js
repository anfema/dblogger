const Result = require('./result');
const getLogger = require('./getLogger');

function singleFile(ctx) {
	return getLogger(ctx)
	.then(logger =>
		logger.model.Source.findOne({
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
			path: obj.path,
		}).serialize('file');
	});
}

function fileList(ctx) {
	const files = [];
	let offset = 0;

	if (ctx.query.page) {
		offset = ctx.query.page * ctx.limit;
	}

	return getLogger(ctx)
	.then(logger =>
		logger.model.Source.findAndCountAll({
			order: 'id ASC',
			offset,
			limit: ctx.limit,
		})
	)
	.then(({ count, rows }) => {
		for (const file of rows) {
			files.push({
				id: file.id,
				path: file.path,
			});
		}

		ctx.body = new Result(ctx, files, offset, count).serialize('file');
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleFile(ctx);
	}

	return fileList(ctx);
};
