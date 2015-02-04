global.assert = require('assert');
global.sinon = require('sinon');

global.sinon.assert.expose(global.assert, { prefix: '' });
