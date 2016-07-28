'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');
var helper = require('./helper');

suite('buildtime pseudolocalizations', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('are included by default', function(done) {
    helper.exec('make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      var folderPath = path.join(process.cwd(), 'profile', 'apps', 'system');
      var enUSFileInFolder =
        fs.readFileSync(path.join(folderPath, 'locales-obj/index.en-US.json'),
                        { encoding: 'utf-8' });
      var psaccentPathInFolder = 'locales-obj/index.fr-x-psaccent.json';
      var psaccentFileInFolder =
        fs.readFileSync(path.join(folderPath, psaccentPathInFolder),
                        { encoding: 'utf-8' });

      assert.isNotNull(
        psaccentFileInFolder,
        'Accented English file ' + psaccentPathInFolder + ' should exist');
      assert.notDeepEqual(
        JSON.parse(psaccentFileInFolder),
        JSON.parse(enUSFileInFolder),
        'Accented English file should not be identical to regular English');
      done();
    });
  });

});

