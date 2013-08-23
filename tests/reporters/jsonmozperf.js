/**
 * Initialize a new `JSON` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 * @api public
 */

'use strict';

(function(global) {


function JSONMozPerfReporter(runner) {
  global.Mocha.reporters.BaseMozPerfReporter.call(this, runner);
};  

JSONMozPerfReporter.prototype.printResult = function jsonPrintResult(obj){
    process.stdout.write(JSON.stringify(obj, null, 2));
}; 

global.Mocha.reporters.JSONMozPerf = JSONMozPerfReporter;
})(this);
