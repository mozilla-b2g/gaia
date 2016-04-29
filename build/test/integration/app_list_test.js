'use strict';

var assert = require('chai').assert;
var helper = require('./helper');
var fs = require('fs');
var path = require('path');

suite('Build GAIA from different app list', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('GAIA_DEVICE_TYPE=tablet make', function(done) {
    helper.exec('GAIA_DEVICE_TYPE=tablet make', function(err, stdout, stderr) {
      helper.checkError(err, stdout, stderr);

      // zip path for system app
      var smsPath = path.join(process.cwd(), 'profile', 'apps', 'sms');

      // sms should not exists in Tablet builds
      assert.isFalse(fs.existsSync(smsPath));

      // vertical homescreen should exist in tablet builds
      var homePath = path.join(process.cwd(), 'profile', 'apps', 'homescreen',
                               'index.html');
      assert.isTrue(fs.existsSync(homePath));

      done();
    });
  });

  test('GAIA_DEVICE_TYPE=phone make', function(done) {
    helper.exec('GAIA_DEVICE_TYPE=phone make', function(err, stdout, stderr) {
      helper.checkError(err, stdout, stderr);

      // zip path for sms app
      // FIXME: re-enable when SMS is back
      // var smsPath = path.join(process.cwd(), 'profile', 'apps', 'sms');

      // sms should exists in Phone builds
      // FIXME: re-enable when SMS is back
      // assert.isTrue(fs.existsSync(smsPath));
      assert.ok(true);

      // vertical homescreen should exists
      var homePath = path.join(process.cwd(), 'profile', 'apps', 'homescreen',
                               'index.html');
      assert.isTrue(fs.existsSync(homePath));

      // Check init.json
      var initPath = path.join(process.cwd(), 'build_stage', 'homescreen',
                               'js', 'init.json');
      assert.ok(fs.existsSync(initPath), 'init.json should exist');

      done();
    });
  });

  test('GAIA_DEVICE_TYPE=tv make', function(done) {
    helper.exec('GAIA_DEVICE_TYPE=tv make', function(err, stdout, stderr) {
      helper.checkError(err, stdout, stderr);

      // zip path for homescreen-stingray app
      var shPath = path.join(process.cwd(), 'profile', 'apps', 'smart-home');

      // smart-home should exist in tv builds
      assert.ok(fs.existsSync(shPath));

      // vertical homescreen should not exist
      var homePath = path.join(process.cwd(), 'profile', 'apps', 'homescreen');
      assert.isFalse(fs.existsSync(homePath));

      done();
    });
  });
});
