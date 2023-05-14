'use strict';

const commander = require('..');
const assert = require('assert').strict;

assert.strictEqual(commander(), 'Hello from commander');
console.info('commander tests passed');
