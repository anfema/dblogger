const Sequelize = require('sequelize');

module.exports = function (db, tablePrefix) {
	const Log = db.define(`${tablePrefix}_log`, {
		id: {
			type: Sequelize.INTEGER,
			unique: true,
			primaryKey: true,
			autoIncrement: true,
		},
		level: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		message: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
		pid: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		time: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: () => new Date().getTime(),
		},
		content: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
	});

	const Tag = db.define(`${tablePrefix}_tag`, {
		id: {
			type: Sequelize.INTEGER,
			unique: true,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: Sequelize.STRING(255),
			allowNull: false,
		},
	});

	const Source = db.define(`${tablePrefix}_source`, {
		id: {
			type: Sequelize.INTEGER,
			unique: true,
			primaryKey: true,
			autoIncrement: true,
		},
		path: {
			type: Sequelize.STRING(1024),
			allowNull: false,
		},
	});

	const Func = db.define(`${tablePrefix}_function`, {
		id: {
			type: Sequelize.INTEGER,
			unique: true,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: Sequelize.STRING(1024),
			allowNull: false,
		},
		lineNumber: {
			type: Sequelize.INTEGER,
			allowNull: true,
			defaultValue: null,
		},
	});

	const Logger = db.define(`${tablePrefix}_logger`, {
		id: {
			type: Sequelize.INTEGER,
			unique: true,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: Sequelize.STRING(255),
			allowNull: false,
		},
	});

	const Hostname = db.define(`${tablePrefix}_hosts`, {
		id: {
			type: Sequelize.INTEGER,
			unique: true,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: Sequelize.STRING(255),
			allowNull: false,
		},
	});

	Tag.belongsToMany(Log, {
		as: 'Entries',
		through: `${tablePrefix}_log_tag`,
		foreignKey: 'tagID',
		otherKey: 'logID',
	});

	Log.belongsToMany(Tag, {
		as: 'Tags',
		through: `${tablePrefix}_log_tag`,
		foreignKey: 'logID',
		otherKey: 'tagID',
	});

	Source.hasMany(Func, {
		as: 'Functions',
		foreignKey: 'sourceID',
	});

	Log.belongsTo(Func, {
		as: 'Function',
		foreignKey: 'functionID',
	});

	Log.belongsTo(Logger, {
		as: 'Logger',
		foreignKey: 'loggerID',
	});

	Log.belongsTo(Hostname, {
		as: 'Hostname',
		foreignKey: 'hostnameID',
	});

	Func.belongsTo(Source, {
		as: 'Source',
		foreignKey: 'sourceID',
	});

	Func.hasMany(Log, {
		as: 'Function',
		foreignKey: 'functionID',
	});

	return db.sync().then(() => ({ Log, Tag, Source, Func, Logger, Hostname }));
};
