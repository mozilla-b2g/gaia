/**
 * Initialize a new `JSON` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 * @api public
 */

'use strict';

(function(global) {



function JSONMozPerfReporter(runner) {
  importScripts("../reporters/basemozreporter.js");

  BasePerfReporter(runner, function(obj){
    process.stdout.write(JSON.stringify(obj, null, 2));
  }); 

}  

global.Mocha.reporters.JSONMozPerf = JSONMozPerfReporter;
})(this);
