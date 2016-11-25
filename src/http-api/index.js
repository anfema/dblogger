const Koa = require('koa');
const auth = require('koa-basic-auth');
const compress = require('koa-compress');
const KoaRouter = require('koa-router');
const cors = require('koa-cors');

const getLogs = require('./logs');
const getTags = require('./tags');
const getFiles = require('./files');
const getLocations = require('./locations');
const getLoggers = require('./loggers');
const getTimerange = require('./timerange');
const getPIDs = require('./pids');
const getLevels = require('./levels');
const getHosts = require('./hosts');

function jsonAPIError(ctx, err) {
	if (err) {
		if (!err.status) {
			err.status = 500;
		}
		ctx.set('Content-Type', 'application/json');
		ctx.body = {
			errors: [{
				status: err.status,
				title: err.message,
				meta: {
					trace: (() => {
						if (process.env.NODE_ENV !== 'production') {
							return err.stack.split('\n');
						}

						return undefined;
					})(),
				},
			}],
		};
		ctx.status = err.status;
		if (err.status === 401) {
			ctx.set('WWW-Authenticate', 'Basic');
		}
	}

	if (ctx.status === 404) {
		ctx.set('Content-Type', 'application/json');
		ctx.body = {
			errors: [{
				status: 404,
				title: 'Not found',
			}],
		};
		ctx.status = 404;
	}
}

function jsonError(ctx, err) {
	if (err) {
		if (!err.status) {
			err.status = 500;
		}
		ctx.set('Content-Type', 'application/json');
		ctx.body = {
			error: {
				status: err.status,
				message: err.message,
				trace: (() => {
					if (process.env.NODE_ENV !== 'production') {
						return err.stack.split('\n');
					}

					return undefined;
				})(),
			},
		};
		ctx.status = err.status;
		if (err.status === 401) {
			ctx.set('WWW-Authenticate', 'Basic');
		}
	}

	if (ctx.status === 404) {
		ctx.set('Content-Type', 'application/json');
		ctx.body = {
			error: {
				status: 404,
				message: 'Not found',
			},
		};
		ctx.status = 404;
	}
}

function errorMiddleware(ctx, next) {
	try {
		return next()
		.then(() => {
			if (ctx.accepts('application/vnd.api+json')) {
				return jsonAPIError(ctx);
			}

			return jsonError(ctx);
		});
	} catch (err) {
		if (ctx.accepts('application/vnd.api+json')) {
			return jsonAPIError(ctx, err);
		}

		return jsonError(ctx, err);
	}
}

// options:
// - auth: HTTP Basic auth
//   - name
//   - pass
// - pageSize: Pagination page size
// - combinedLogging: All loggers use the same underlying DB, if set to true the logger query filter may be skipped

function createServer(options) {
	const app = new Koa();
	const router = new KoaRouter();

	app.use(cors());

	// convert errors into JSON
	app.use(errorMiddleware);

	// enable compression for all responses
	app.use(compress({ threshold: 1 }));

	// enable auth when requested
	if (options.auth) {
		app.use(auth(options.auth));
	}

	// add routes
	router.get('loggers',	'/loggers',		getLoggers);
	router.get('logs',		'/logs',		getLogs);
	router.get('tags',		'/tags',		getTags);
	router.get('files',		'/files',		getFiles);
	router.get('locations',	'/locations',	getLocations);
	router.get('timerange',	'/timerange',	getTimerange);
	router.get('pids',		'/pids',		getPIDs);
	router.get('levels',	'/levels',		getLevels);
	router.get('hosts',		'/hosts',		getHosts);

	// single object getters
	router.get('loggers',	'/loggers/:id',		getLoggers);
	router.get('logs',		'/logs/:id',		getLogs);
	router.get('tags',		'/tags/:id',		getTags);
	router.get('files',		'/files/:id',		getFiles);
	router.get('locations',	'/locations/:id',	getLocations);
	router.get('timerange',	'/timerange/:id',	getTimerange);
	router.get('pids',		'/pids/:id',		getPIDs);
	router.get('levels',	'/levels/:id',		getLevels);
	router.get('hosts',		'/hosts/:id',		getHosts);

	// add router to middleware
	app.use(router.routes());
	app.use(router.allowedMethods());

	app.context.loggers = new Set();
	app.registerLogger = (name) => {
		app.context.loggers.add(name);
	};
	app.context.limit = options.pageSize || 250;
	app.context.combinedLogging = options.combinedLogging || false;

	return app;
}

module.exports = createServer;
