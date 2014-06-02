/**
 * Initialize a new `Console` reporter for MozPerf.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 */

'use strict';

var BaseMozPerfReporter = require('./basemozperf.js')

exports = module.exports = ConsoleMozPerfReporter;

function ConsoleMozPerfReporter(runner) {
   BaseMozPerfReporter.call(this, runner);
}

ConsoleMozPerfReporter.prototype.__proto__ = BaseMozPerfReporter.prototype;

ConsoleMozPerfReporter.prototype.printResult = function (obj) {

  var consoleOut = 'Application: ' + obj.stats.application + '\n\n';
  consoleOut += 'Stats: \n';
  for (var key in obj.stats) {
    if (obj.stats[key] != null) {
      consoleOut += '  ' + key + ': ' + obj.stats[key] + '\n';
    }
  }

  consoleOut += '\nFailures: \n';

  var failures = obj.failures;
  if (failures.length == 0) {
    consoleOut += '  No test failed\n\n';
  } else {
    for (var i = 0; i < failures.length; i++) {
      for (var key in failures[i]) {
        if (failures[i][key] != null) {
          consoleOut += '  ' + key + ': ' + failures[i][key] + '\n';
        }
      }
      consoleOut += '\n';
    }
  }

  consoleOut += '\nPasses: \n';

  var passes = obj.passes;

  if (passes.length == 0) {
    consoleOut += '  No test passed\n\n';
  } else {
    for (var i = 0; i < passes.length; i++) {
      for (var key in passes[i]) {
        if (passes[i][key] != null) {
          var datum = passes[i][key];
          consoleOut += '  ' + key + ': ' +
            (typeof datum === 'object' ? JSON.stringify(datum) : datum) +
            '\n';
        }
      }
      consoleOut += '\n';
    }
  }

  consoleOut += '-----------------------------------';

  process.stdout.write(consoleOut);
}
