global.assert = require('chai').assert;
global.sinon = require('sinon');

global.sinon.assert.expose(global.assert, { prefix: '' });
