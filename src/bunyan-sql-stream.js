const Writable = require('stream').Writable;

class LogStream extends Writable {

	constructor(model) {
		super({ objectMode: true });
		this.model = model;
	}

	write(chunk, env, cb) {
		const content = chunk;

		this.model.Log.create({
			name: content.name, // TODO: normalize
			hostname: content.hostname, // TODO: normalize
			level: content.level,
			message: content.msg,
			pid: content.pid,
			time: content.time.getTime(),
			content: JSON.stringify(content),
		})
		.then((log) => {
			const promises = [];

			// add tags to db or find and associate
			if (content.tags) {
				promises.push(
					Promise.all(
						content.tags.map(t =>
							// find or create tag
							this.model.Tag.findOrCreate({
								where: {
									name: t,
								},
								defaults: {
									name: t,
								},
							})
							.then(([tag, created]) => tag)
						)
					)
					// associate tags
					.then((tags) => {
						log.setTags(tags);
					})
				);
			}

			// add hostname to db or find and associate
			if (content.hostname) {
				promises.push(
					this.model.Hostname.findOrCreate({
						where: {
							name: content.hostname.toString(),
						},
						defaults: {
							name: content.hostname.toString(),
						},
					})
					// associate hostname
					.then(([host, created]) => {
						log.hostnameID = host.id;
					})
				);
			}

			// add logger name to db or find and associate
			if (content.name) {
				promises.push(
					this.model.Logger.findOrCreate({
						where: {
							name: content.name.toString(),
						},
						defaults: {
							name: content.name.toString(),
						},
					})
					// associate hostname
					.then(([logger, created]) => {
						log.loggerID = logger.id;
					})
				);
			}

			// add source and function or find and associate
			if (content.src) {
				promises.push(
					// find or create source
					this.model.Source.findOrCreate({
						where: {
							path: content.src.file.toString(),
						},
						defaults: {
							path: content.src.file.toString(),
						},
					})
					// associate source
					.then(([source, created]) => {
						// find or create function
						return this.model.Func.findOrCreate({
							where: {
								name: content.src.func.toString(),
								lineNumber: content.src.line,
								sourceID: source.id,
							},
							defaults: {
								name: content.src.func.toString(),
								lineNumber: content.src.line,
								sourceID: source.id,
							},
						});
					})
					// associate function
					.then(([func, created]) => {
						log.functionID = func.id;
					})
				);
			}

			return Promise.all(promises)
			.then(() => log.save());
		})
		.then(() => cb());
	}
}

module.exports = LogStream;
