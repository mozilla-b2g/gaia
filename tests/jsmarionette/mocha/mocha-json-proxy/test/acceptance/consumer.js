/* global forkFixture */
'use strict';
var Consumer = require('../../consumer');
var Mocha = require('mocha');

suite('reporter', function() {
  function testReporter(reporterType) {
    suite(reporterType, function() {
      ['pass', 'fail', 'pending'].forEach(function(testType) {
        test(test, function(done) {
          var child = forkFixture(testType);
          var runner = new Consumer(child);
          /* jshint nonew: false */
          new Mocha.reporters[reporterType](runner);
          /* jshint nonew: true */
          runner.once('end', done);
        });
      });
    });
  }

  ['Dot', 'Spec'].forEach(testReporter);
});
