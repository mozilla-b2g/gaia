// exported expect, sinon

global.expect = require('expect.js');
global.sinon = require('sinon');
require('observe-shim');
global.ObserveUtils = require('../lib/observe-utils');
require('./defineObservableProperties');
require('./list');
require('./bug');
