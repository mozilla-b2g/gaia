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
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'sms.gaiamobile.org', 'application.zip');

      // sms should not exists in Tablet builds
      assert.isFalse(fs.existsSync(zipPath));

      // vertical homescreen and collection should exist in tablet builds
      var zipVertHomePath = path.join(process.cwd(), 'profile', 'webapps',
        'verticalhome.gaiamobile.org', 'application.zip');
      var zipCollectionPath = path.join(process.cwd(), 'profile', 'webapps',
        'collection.gaiamobile.org', 'application.zip');
      assert.isTrue(fs.existsSync(zipVertHomePath));
      assert.isTrue(fs.existsSync(zipCollectionPath));

      done();
    });
  });

  test('GAIA_DEVICE_TYPE=phone make', function(done) {
    helper.exec('GAIA_DEVICE_TYPE=phone make', function(err, stdout, stderr) {
      helper.checkError(err, stdout, stderr);

      // zip path for sms app
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'sms.gaiamobile.org', 'application.zip');

      // sms should not exists in Tablet builds
      assert.ok(fs.existsSync(zipPath));

      // vertical homescreen and collection should exists
      var zipVertHomePath = path.join(process.cwd(), 'profile', 'webapps',
        'verticalhome.gaiamobile.org', 'application.zip');
      var zipCollectionPath = path.join(process.cwd(), 'profile', 'webapps',
        'collection.gaiamobile.org', 'application.zip');
      assert.ok(fs.existsSync(zipVertHomePath));
      assert.ok(fs.existsSync(zipCollectionPath));

      // Check init.json
      var initPath = path.join(process.cwd(), 'build_stage',
        'verticalhome', 'js', 'init.json');
      assert.ok(fs.existsSync(initPath),
        'init.json should exist');

      // Check pre_installed_collections.json
      var collectionPath = path.join(process.cwd(), 'build_stage',
        'collection', 'js', 'pre_installed_collections.json');
      assert.ok(fs.existsSync(collectionPath),
        'pre_installed_collections.json should exist');

      done();
    });
  });

  test('GAIA_DEVICE_TYPE=tv make', function(done) {
    helper.exec('GAIA_DEVICE_TYPE=tv make', function(err, stdout, stderr) {
      helper.checkError(err, stdout, stderr);

      // zip path for homescreen-stingray app
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'smart-home.gaiamobile.org', 'application.zip');

      // smart-home should exist in tv builds
      assert.ok(fs.existsSync(zipPath));

      // vertical homescreen and collection should not exist
      var zipVertHomePath = path.join(process.cwd(), 'profile', 'webapps',
        'verticalhome.gaiamobile.org', 'application.zip');
      var zipCollectionPath = path.join(process.cwd(), 'profile', 'webapps',
        'collection.gaiamobile.org', 'application.zip');
      assert.isFalse(fs.existsSync(zipVertHomePath));
      assert.isFalse(fs.existsSync(zipCollectionPath));

      done();
    });
  });
});
