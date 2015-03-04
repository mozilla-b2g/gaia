'use strict';

var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var fs = require('fs');
var path = require('path');
var helper = require('./helper');

suite('Collection app tests', function() {

  suiteSetup(function() {
    rmrf('profile');
    rmrf('profile-debug');
    rmrf('build_stage');
  });

  test('GAIA_DEV_PIXELS_PER_PX=1.5 APP=collection make', function(done) {
    helper.exec('GAIA_DEV_PIXELS_PER_PX=1.5 APP=collection make',
      function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      // The collection zip should exist.
      var zipCollectionPath = path.join(process.cwd(), 'profile', 'webapps',
        'collection.gaiamobile.org', 'application.zip');
      assert.ok(fs.existsSync(zipCollectionPath));

      // Check pre_installed_collections.json
      var collectionPath = path.join(process.cwd(), 'build_stage',
        'collection', 'js', 'pre_installed_collections.json');
      assert.ok(fs.existsSync(collectionPath),
        'init.json should exist');

      var collectionInfo = JSON.parse(fs.readFileSync(collectionPath));
      var expected = [
        'app://collection.gaiamobile.org/collections/social/icon.png',
        'app://collection.gaiamobile.org/collections/games/icon.png',
        'app://collection.gaiamobile.org/collections/music/icon.png'
      ];
      collectionInfo.collections.forEach(function(data, idx) {
        assert.equal(data.icon, expected[idx],
          'Expected collection icon not found in manifest.');
      });

      // Verify collection icon paths.
      var collectionIconPath = path.join(process.cwd(), 'build_stage',
        'collection', 'collections', 'social', 'icon.png');
      assert.ok(fs.existsSync(collectionIconPath),
        'Social icon.png should exist');

      done();
    });
  });

  teardown(function() {
    rmrf('profile');
    rmrf('profile-debug');
    rmrf('build_stage');
  });

});
