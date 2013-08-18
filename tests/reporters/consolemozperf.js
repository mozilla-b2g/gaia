/**
 * Initialize a new `Console` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 */

'use strict';

(function(global) {

function ConsoleMozPerfReporter(runner) {
  importScripts("../reporters/basemozreporter.js");
  
  BasePerfReporter(runner, function(obj){
    process.stdout.write(generateConsoleOut(obj));
  });  
}

function generateConsoleOut(objOut) {
  var consoleOut = 'Application: ' + objOut.stats.application + '\n\n';
  consoleOut += 'Stats: \n';
  for (var key in objOut.stats) {
    if (objOut.stats[key] != null)
      consoleOut += '  ' + key + ': ' + objOut.stats[key] + '\n';
  }

  consoleOut += '\nFailures: \n';

  var failures = objOut.failures;
  if (failures.length == 0) {
    consoleOut += '  No test failed\n\n';
  } else {
    for (var i = 0; i < failures.length; i++) {
      for (var key in failures[i]) {
        if (failures[i][key] != null)
          consoleOut += '  ' + key + ': ' + failures[i][key] + '\n';
      }
      consoleOut += '\n';
    }
  }

  consoleOut += '\nPasses: \n';

  var passes = objOut.passes;

  if (passes.length == 0) {
    consoleOut += '  No test passed\n\n';
  } else {
    for (var i = 0; i < passes.length; i++) {
      for (var key in passes[i]) {
        if (passes[i][key] != null)
          consoleOut += '  ' + key + ': ' + passes[i][key] + '\n';
      }
      consoleOut += '\n';
    }
  }

  consoleOut += '-----------------------------------';

  return consoleOut;
}

global.Mocha.reporters.ConsoleMozPerf = ConsoleMozPerfReporter;
})(this);
