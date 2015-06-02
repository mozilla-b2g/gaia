'use strict';
var assert = require('chai').assert;

global.assert = assert;
global.sinon = require('sinon');

// so we can call assert.calledWith
global.sinon.assert.expose(assert, { prefix: '' });
