const Result = require('./result');
const getLogger = require('./getLogger');

function singlePID(ctx) {
	return getLogger(ctx)
	.then(logger =>
		logger.db.query(
			`SELECT pid, COUNT(*) as count
				FROM ${logger.tablePrefix}_log log
				WHERE pid = :pid
				GROUP BY pid
				ORDER BY pid`,
			{
				replacements: {
					name: ctx.query.logger,
					pid: parseInt(ctx.params.id, 10),
				},
				type: logger.db.QueryTypes.SELECT,
			}
		)
	)
	.then((pid) => {
		if ((pid !== null) && (pid.length > 0)) {
			ctx.body = new Result(ctx, {
				id: pid[0].pid,
				count: pid[0].count,
			}).serialize('pid');

			return;
		}

		ctx.throw(404);

		return;
	});
}

function pidList(ctx) {
	const pids = [];
	let offset = 0;
	let where = '';

	if (ctx.query.page) {
		offset = ctx.query.page * ctx.limit;
	}

	if (ctx.query.logger) {
		where = 'WHERE logger.name = :name';
	}

	return getLogger(ctx)
	.then(logger =>
		logger.db.query(
			`SELECT COUNT(pid) as count
				FROM (
					SELECT pid
					FROM ${logger.tablePrefix}_log log
					JOIN ${logger.tablePrefix}_logger logger ON log.loggerID = logger.id
					${where}
					GROUP BY pid
				);`,
			{
				replacements: {
					name: ctx.query.logger,
				},
				type: logger.db.QueryTypes.SELECT,
			}
		)
		.then(count => ({ logger, count }))
	)
	.then(({ logger, count }) =>
		logger.db.query(
			`SELECT pid, COUNT(*) as count
				FROM ${logger.tablePrefix}_log log
				JOIN ${logger.tablePrefix}_logger logger ON log.loggerID = logger.id
				${where}
				GROUP BY pid
				ORDER BY pid
				LIMIT ${ctx.limit}
				OFFSET ${offset};`,
			{
				replacements: {
					name: ctx.query.logger,
				},
				type: logger.db.QueryTypes.SELECT,
			}
		)
		.then(objects => ({ count, objects }))
	)
	.then(({ count, objects }) => {
		for (const pid of objects) {
			pids.push({
				id: pid.pid,
				count: pid.count,
			});
		}

		ctx.body = new Result(ctx, pids, offset, count[0].count).serialize('pid');
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singlePID(ctx);
	}

	return pidList(ctx);
};

