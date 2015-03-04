'use strict';

var helper = require('./helper');

suite('shared CSS', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make APP=test-shared-css-app, checking shared css are imported',
    function(done) {
      var command = 'make APP=test-shared-css-app ' +
        'GAIA_APP_CONFIG=' + __dirname + '/../fixtures/shared_css.list';
      helper.exec(command, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        done();
      });
    });
});
