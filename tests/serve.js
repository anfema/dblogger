const createServer = require('../api');
const createLogger = require('../index');

function server() {
	createLogger('default', {
		connection: {
			type: 'sqlite',
			dbPath: '/tmp/logger.db',
		},
		src: true,
	}).then((l) => {
		l.tag('example', 'server').info('Server started');
	});

	const s = createServer({
		auth: {
			name: 'admin',
			pass: 'admin',
		},
		pageSize: 10,
		combinedLogging: true,
	});

	s.registerLogger('default');

	return s;
}

server().listen(3000);
