const Sequelize = require('sequelize');
const bunyan = require('bunyan');
const BunyanStream = require('./bunyan-sql-stream');
const initializeModels = require('./model');

bunyan.prototype.log = bunyan.prototype.info;

function initializeDBInfo(options) {
	const connection = {};

	connection.host = options.host;
	connection.database = options.database;
	if (options.port) {
		connection.port = options.port;
	}
	if (options.username) {
		connection.username = options.username;
	}
	if (options.password) {
		connection.password = options.password;
	}
	connection.logging = false; // console.log;
	connection.pool = false;
	connection.transactionType = 'IMMEDIATE';

	return connection;
}

function initDB(connection, tablePrefix) {
	connection.define = {
		timestamps: false,
		freezeTableName: true,
	};

	const db = new Sequelize(connection);

	return initializeModels(db, tablePrefix).then(model => ({ model, db }));
}

// create a logger
//
// options:
// - level: log level (optional, defaults to 'info')
// - src: bool, log source position (optional, defaults to false)
// - connection: db connection info
//   - type: sqlite|postgresql|mysql|mariadb
//   - dbPath: path to db file (sqlite only)
//   - host: db host
//   - database: db name to use
//   - port: port number for db server (optional)
//   - username: username for db server (optional)
//   - password: password for db server (optional)
// - tablePrefix: prefix for logging tables (optional, defaults to 'logger')

function createLogger(name, options) {
	if ((!options) || (!options.connection)) {
		throw new Error('No valid configuration for the logger supplied');
	}

	let connection = {};
	let validConfig = true;

	connection = initializeDBInfo(options.connection);
	switch (options.connection.type) {
		case 'sqlite':
			connection.dialect = 'sqlite';
			if (options.connection.dbPath) {
				connection.storage = options.connection.dbPath;
			} else {
				throw new Error('Please specify a \'dbPath\'');
			}
			break;
		case 'postgresql':
			connection.dialect = 'postgres';
			connection.native = true;
			break;
		case 'mysql':
			connection.dialect = 'mysql';
			break;
		case 'mariadb':
			connection.dialect = 'mariadb';
			break;
		default:
			process.emitWarning('Invalid configuration for logger, falling back to stderr', 'Logger');
			validConfig = false;
			break;
	}


	const logger = bunyan.createLogger({
		name,
		level: options.level,
		streams: [
			{
				level: options.level || 'info',
				stream: process.stderr,
			},
		],
		src: options.src || false,
		tags: [],
	});

	logger.tag = function (...tags) {
		return logger.child({ tags });
	};


	logger.onEntry = () => {};
	logger.tablePrefix = options.tablePrefix || 'logger';

	logger.reopen = () => {
		if (validConfig) {
			return initDB(connection, logger.tablePrefix)
			.then(({ model, db }) => {
				const stream = new BunyanStream(model);
				const wr = stream.write;

				// monkey patch stream
				stream.write = function(chunk, env, callback) {
					const cb = callback || (() => {});
					const modifiedArguments = [chunk, env];

					modifiedArguments.push(() => {
						logger.onEntry();
						cb();
					});

					return wr.apply(this, modifiedArguments);
				};

				logger.model = model;
				logger.db = db;
				logger.streams = [];

				logger.addStream({
					level: options.level || 'info',
					type: 'raw',
					stream,
				});

				return logger;
			});
		}

		return Promise.resolve(logger);
	};

	process.on('SIGHUP', () => {
		logger.reopen();
	});

	return logger.reopen();
}

// cache variable to reuse loggers
const loggers = {};

// module exports logger function, if named logger already exists returns cached version
module.exports = function (name = 'default', options = undefined) {
	if (loggers[name] && options) {
		return loggers[name].reopen();
	} else if (loggers[name]) {
		return Promise.resolve(loggers[name]);
	}

	return createLogger(name, options).then((logger) => {
		loggers[name] = logger;

		return logger;
	});
};
