import fs from 'fs';
import test from 'ava';
import logger from '../index';

test('Empty init', async (t) => {
	try {
		await logger();
		t.fail('Initializing empty logger should fail');
	} catch (err) {
		t.is(err.message, 'No valid configuration for the logger supplied');
	}
});

test('Valid init', async (t) => {
	try {
		await logger('default', {
			connection: {
				type: 'sqlite',
				dbPath: '/tmp/logger.db',
			},
		});
		t.is(fs.existsSync('/tmp/logger.db'), true);
	} catch (err) {
		t.fail(err);
	}
});

test('Cached init', async (t) => {
	try {
		const log1 = await logger('default', {
			connection: {
				type: 'sqlite',
				dbPath: '/tmp/logger.db',
			},
		});
		const log2 = await logger('default');

		t.is(log1, log2);
	} catch (err) {
		t.fail(err);
	}
});

// cleanup logger db after each test
test.afterEach.always(() => {
	try {
		fs.unlinkSync('/tmp/logger.db');
	} catch (err) {
		// just ignore the error
	}
});


// TODO: Check re-creation on HUP
