import os from 'os';
import fs from 'fs';
import test from 'ava';
import getLogger from '../index';

function monitorLogItem(logger, where) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject('Entry did not show up in time');
		}, 2000);

		logger.onEntry = async () => {
			logger.model.Log.findOne({ where })
			.then((entry) => {
				logger.onEntry = () => {};
				clearTimeout(timeout);

				if (entry !== null) {
					resolve(entry);
				}
				reject('Entry not found');
			});
		};
	});
}

async function getDebuggableLogger(name = 'default', options = {}) {
	options.connection = {
		type: 'sqlite',
		dbPath: '/tmp/logger.db',
	};

	return await getLogger(name, options);
}

test('Simple log', async (t) => {
	const logger = await getDebuggableLogger();
	const message = 'Test simple log';

	const result = monitorLogItem(logger, { message })
	.then((entry) => {
		t.not(entry, null);
		t.is(entry.hostname, os.hostname());
		t.is(entry.pid, process.pid);
		t.is(entry.name, 'default');
		t.is(entry.level, 30);
		t.true(entry.time > 0, 'Time is zero');
		t.true(entry.time <= new Date().getTime(), 'Time is in future');
		t.true(entry.content.length > 0, 'Content is empty');
		t.is(entry.functionID, null);
	})
	.catch((err) => {
		t.fail(err);
	});

	logger.info(message);

	return result;
});

test('Error log', async (t) => {
	const logger = await getDebuggableLogger();
	const message = 'Test error log';

	const result = monitorLogItem(logger, { message })
	.then((entry) => {
		t.not(entry, null);
		t.is(entry.hostname, os.hostname());
		t.is(entry.pid, process.pid);
		t.is(entry.name, 'default');
		t.is(entry.level, 50);
		t.true(entry.time > 0, 'Time is zero');
		t.true(entry.time <= new Date().getTime(), 'Time is in future');
		t.true(entry.content.length > 0, 'Content is empty');
		t.is(entry.functionID, null);
	})
	.catch((err) => {
		t.fail(err);
	});

	logger.error(message);

	return result;
});

test('Tagged log', async (t) => {
	const logger = await getDebuggableLogger();
	const message = 'Test tagged log';

	const result = monitorLogItem(logger, { message })
	.then((entry) => {
		t.not(entry, null);
		t.is(entry.hostname, os.hostname());
		t.is(entry.pid, process.pid);
		t.is(entry.name, 'default');
		t.is(entry.level, 30);
		t.true(entry.time > 0, 'Time is zero');
		t.true(entry.time <= new Date().getTime(), 'Time is in future');
		t.true(entry.content.length > 0, 'Content is empty');
		t.is(entry.functionID, null);

		return entry.getTags();
	})
	.then((tags) => {
		t.not(tags, null);
		t.is(tags.length, 2);
	})
	.catch((err) => {
		t.fail(err);
	});

	logger.tag('example', 'test').log(message);

	return result;
});

test('Mixed tagged log', async (t) => {
	const logger = await getDebuggableLogger();
	const message = 'Test mixed tagged log 1';
	const message2 = 'Test mixed tagged log 2';

	const result1 = monitorLogItem(logger, { message })
	.then((entry) => {
		t.not(entry, null);
		t.is(entry.hostname, os.hostname());
		t.is(entry.pid, process.pid);
		t.is(entry.name, 'default');
		t.is(entry.level, 30);
		t.true(entry.time > 0, 'Time is zero');
		t.true(entry.time <= new Date().getTime(), 'Time is in future');
		t.true(entry.content.length > 0, 'Content is empty');
		t.is(entry.functionID, null);

		return entry.getTags();
	})
	.then((tags) => {
		t.not(tags, null);
		t.is(tags.length, 2);
	})
	.catch((err) => {
		t.fail(err);
	})
	.then(() => {
		const result2 = monitorLogItem(logger, { message: message2 })
		.then((entry) => {
			t.not(entry, null);
			t.is(entry.hostname, os.hostname());
			t.is(entry.pid, process.pid);
			t.is(entry.name, 'default');
			t.is(entry.level, 30);
			t.true(entry.time > 0, 'Time is zero');
			t.true(entry.time <= new Date().getTime(), 'Time is in future');
			t.true(entry.content.length > 0, 'Content is empty');
			t.is(entry.functionID, null);

			return entry.getTags();
		})
		.then((tags) => {
			t.is(tags.length, 0);
		})
		.catch((err) => {
			t.fail(err);
		});

		logger.log(message2);

		return result2;
	});

	logger.tag('example', 'test').log(message);

	return result1;
});

test('Log with source', async (t) => {
	const logger = await getDebuggableLogger('src', { src: true });
	const message = 'Test log with source';

	const result = monitorLogItem(logger, { message })
	.then((entry) => {
		t.not(entry, null);
		t.is(entry.hostname, os.hostname());
		t.is(entry.pid, process.pid);
		t.is(entry.name, 'src');
		t.is(entry.level, 30);
		t.true(entry.time > 0, 'Time is zero');
		t.true(entry.time <= new Date().getTime(), 'Time is in future');
		t.true(entry.content.length > 0, 'Content is empty');
		t.not(entry.functionID, null);

		return entry.getFunction();
	})
	.then((func) => {
		t.not(func, null);
		t.not(func.sourceID, null);
		t.not(func.lineNumber, null);
		t.not(func.lineNumber, 0);

		return func.getSource();
	})
	.then((source) => {
		t.not(source, null);
		t.is(source.path.slice(-6), 'log.js');
	})
	.catch((err) => {
		t.fail(err);
	});

	logger.log(message);

	return result;
});

// cleanup logger db after test
test.after.always(() => {
	try {
		fs.unlinkSync('/tmp/logger.db');
	} catch (err) {
		// just ignore the error
	}
});
