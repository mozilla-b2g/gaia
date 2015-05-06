'use strict';

var helper = require('./helper');

suite('GAIA_OPTIMIZE=1', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make with GAIA_OPTIMIZE=1 BUILD_DEBUG=1',
    function(done) {
    helper.exec('GAIA_OPTIMIZE=1 BUILD_DEBUG=1 make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        done();
      }
    );
  });
});
