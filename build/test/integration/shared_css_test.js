'use strict';

var helper = require('./helper');

suite('shared CSS', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make APP=test-shared-css, checking shared css are imported',
    function(done) {
      helper.exec('make APP=test-shared-css', function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        done();
      });
    });
});
