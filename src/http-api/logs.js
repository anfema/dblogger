const Result = require('./result');
const getLogger = require('./getLogger');

function makeResult(ctx, count, offset, rows, logger) {
	return logger.model.Tag.findAll({
		order: 'id ASC',
	})
	.then((tags) => {
		const objs = [];

		for (const row of rows) {
			const obj = JSON.parse(row.content);

			obj.tagIDs = [];
			for (const tag of obj.tags) {
				for (const item of tags) {
					if (item.name === tag) {
						obj.tagIDs.push(item.id);
					}
				}
			}

			obj.name = undefined;
			obj.logger = row.loggerID;
			obj.hostname = undefined;
			obj.host = row.hostnameID;
			obj.id = row.id;
			obj.tags = obj.tagIDs;
			obj.tagIDs = undefined;

			if (logger.src) {
				obj.src = undefined;
				obj.file = row.file;
				obj.location = row.location;
			}

			objs.push(obj);
		}

		ctx.body = new Result(ctx, objs, offset, count).serialize('log', [
			'logger',
			'host',
			'tags',
			'file',
			'location',
			'level',
			'pid',
		]);
	});
}

function singleLog(ctx) {
	let srcJoin = '';
	let srcSelect = '';

	return getLogger(ctx)
	.then((logger) => {
		if (logger.src) {
			srcJoin = `
				JOIN ${logger.tablePrefix}_function func ON log.functionID = func.id
				JOIN ${logger.tablePrefix}_source src ON func.sourceID = src.id
			`;
			srcSelect = `
				, src.id as file
				, func.id as location
			`;
		}

		const sql = `
			SELECT
				log.id as id,
				loggerID,
				hostnameID,
				content
				${srcSelect}
			FROM ${logger.tablePrefix}_log log
			JOIN ${logger.tablePrefix}_log_tag lt ON lt.logID = log.id
			JOIN ${logger.tablePrefix}_tag tag ON lt.tagID = tag.id
			-- JOIN ${logger.tablePrefix}_logger logger ON log.loggerID = logger.id
			-- JOIN ${logger.tablePrefix}_hosts hosts ON log.hostnameID = hosts.id
			${srcJoin}
			WHERE
				log.id = ${parseInt(ctx.params.id, 10)}
			GROUP BY log.id
			ORDER BY time DESC;
		`;

		return logger.db.query(sql, {
			type: logger.db.QueryTypes.SELECT,
		}).then((rows) => {
			if ((rows !== null) && (rows.length > 0)) {
				return makeResult(ctx, 1, 0, rows, logger);
			}

			ctx.throw(404);

			return Promise.resolve();
		});
	});
}

function logList(ctx) {
	let offset = 0;
	const where = ['1=1'];
	let srcJoin = '';
	let srcSelect = '';

	// logger filter
	if (ctx.query.logger) {
		where.push(`log.name = '${ctx.query.logger.replace('\'', '\'\'')}'`);
	}

	// page filter
	if (ctx.query.page) {
		offset = ctx.query.page * ctx.limit;
	}

	// time > filter
	if (ctx.query.from) {
		where.push(`time >= ${new Date(ctx.query.from).getTime()}`);
	}

	// time < filter
	if (ctx.query.to) {
		where.push(`time <= ${new Date(ctx.query.to).getTime()}`);
	}

	// hostname filter
	if (ctx.query.hostname) {
		where.push(`hostname = '${ctx.query.hostname.replace('\'', '\'\'')}'`);
	}

	// pid filter
	if (ctx.query.pid) {
		where.push(`pid = ${parseInt(ctx.query.pid, 10)}`);
	}

	// level filter
	if (ctx.query.level) {
		where.push(`level >= ${parseInt(ctx.query.level, 10)}`);
	}

	// tags filter
	if (ctx.query.tags) {
		const tags = ctx.query.tags.split(',').map(t => `tag.id = ${t}`).join(' OR ');

		where.push(`(${tags})`);
	}

	return getLogger(ctx)
	.then((logger) => {
		// file id filter
		if (logger.src) {
			if (ctx.query.file) {
				where.push(`src.id = ${parseInt(ctx.query.file, 10)}`);
			}
			if (ctx.query.location) {
				where.push(`func.id = ${parseInt(ctx.query.location, 10)}`);
			}
			srcJoin = `
				JOIN ${logger.tablePrefix}_function func ON log.functionID = func.id
				JOIN ${logger.tablePrefix}_source src ON func.sourceID = src.id
			`;
			srcSelect = `
				, src.id as file
				, func.id as location
			`;
		}

		const countSQL = `
			SELECT COUNT(*) as count FROM (
				SELECT
					log.id
				FROM ${logger.tablePrefix}_log log
				JOIN ${logger.tablePrefix}_log_tag lt ON lt.logID = log.id
				JOIN ${logger.tablePrefix}_tag tag ON lt.tagID = tag.id
				${srcJoin}
				WHERE
					${where.join(' AND ')}
				GROUP BY log.id
			)
		`;

		return logger.db.query(countSQL, {
			type: logger.db.QueryTypes.SELECT,
		}).then(count => ({ count, logger }));
	})
	.then(({ count, logger }) => {
		const sql = `
			SELECT
				log.id as id,
				loggerID,
				hostnameID,
				content
				${srcSelect}
			FROM ${logger.tablePrefix}_log log
			JOIN ${logger.tablePrefix}_log_tag lt ON lt.logID = log.id
			JOIN ${logger.tablePrefix}_tag tag ON lt.tagID = tag.id
			-- JOIN ${logger.tablePrefix}_logger logger ON log.loggerID = logger.id
			-- JOIN ${logger.tablePrefix}_hosts hosts ON log.hostnameID = hosts.id
			${srcJoin}
			WHERE
				${where.join(' AND ')}
			GROUP BY log.id
			ORDER BY time DESC
			LIMIT ${ctx.limit}
			OFFSET ${offset};
		`;

		return logger.db.query(sql, {
			type: logger.db.QueryTypes.SELECT,
		}).then(rows => makeResult(ctx, count[0].count, offset, rows, logger));
	});
}

module.exports = (ctx) => {
	if (ctx.params.id) {
		return singleLog(ctx);
	}

	return logList(ctx);
};

