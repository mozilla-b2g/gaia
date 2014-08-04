/**
 * Initialize a new `JSON` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 * @api public
 */

'use strict';

var BaseMozPerfReporter = require('./basemozperf.js')

exports = module.exports = JSONMozPerfReporter;

var Mocha = require('mocha'),
    util = require('util');

function JSONMozPerfReporter(runner) {
  BaseMozPerfReporter.call(this, runner);
}

JSONMozPerfReporter.prototype.__proto__ = BaseMozPerfReporter.prototype;

JSONMozPerfReporter.prototype.printResult = function (obj) {
  process.stdout.write(JSON.stringify(obj, null, 2));
}
