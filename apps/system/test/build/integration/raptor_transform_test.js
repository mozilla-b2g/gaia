'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var helper = require('helper');

suite('System Raptor transform tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('APP=system RAPTOR_TRANSFORM=1 RAPTOR_TRANSFORM_RULES=' +
      process.cwd() + '/apps/system/test/raptor' + ' make',
  function(done) {
    helper.exec('APP=system RAPTOR_TRANSFORM=1 RAPTOR_TRANSFORM_RULES=' +
      process.cwd() + '/apps/system/test/raptor' + ' make',
    function(error, stdout, stderr) {
      if (stderr.match('TransformingFailed')) {
        done(stderr);
      } else {
        done();
      }
    });
  });

});
