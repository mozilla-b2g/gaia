'use strict';

var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var helper = require('./helper');
var fs = require('fs');
var path = require('path');

suite('ADB tests', function() {
  suiteSetup(function() {
    helper.cleanupWorkspace();
    rmrf('build/test/integration/result');
  });

  suiteTeardown(function() {
    helper.cleanupWorkspace();
    rmrf('build/test/integration/result');
  });

  test('make install-test-media', function(done) {
    var expectedCommand = 'push test_media/Pictures /sdcard/DCIM\n' +
                          'push test_media/Movies /sdcard/Movies\n' +
                          'push test_media/Music /sdcard/Music\n';

    helper.exec('ADB=build/test/bin/fake-adb make install-test-media',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        var presetsContent = fs.readFileSync(path.join(process.cwd(), 'build',
            'test', 'integration', 'result'));
        assert.equal(presetsContent,  expectedCommand);
        done();
    });
  });
});
