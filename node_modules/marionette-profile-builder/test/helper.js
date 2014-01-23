global.assert = require('assert');
global.sinon = require('sinon');

// so we can call assert.calledWith
global.sinon.assert.expose(assert, { prefix: '' });
