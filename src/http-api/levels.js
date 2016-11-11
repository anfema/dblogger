const Result = require('./result');
const { levelFromName, nameFromLevel } = require('bunyan');

function singleLevel(ctx) {
	const id = String(parseInt(ctx.params.id, 10));

	if (nameFromLevel[id]) {
		ctx.body = new Result(ctx, {
			id,
			name: nameFromLevel[id],
		}).serialize('level');
		return;
	}

	ctx.throw(404);
}

function levelList(ctx) {
	const levels = [];

	Object.keys(levelFromName).forEach((name) => {
		levels.push({
			id: levelFromName[name],
			name,
		});
	});

	ctx.body = new Result(ctx, levels).serialize('level');
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleLevel(ctx);
	}

	return levelList(ctx);
};

