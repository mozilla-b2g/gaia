'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var assert = require('chai').assert;
var path = require('path');
var AdmZip = require('adm-zip');
var helper = require('./helper');

suite('buildtime pseudolocalizations', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('are included by default', function(done) {
    helper.exec('make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'system.gaiamobile.org', 'application.zip');
      var zip = new AdmZip(zipPath);
      var enUSFileInZip = zip.getEntry('locales-obj/index.en-US.json');
      var psaccentPathInZip = 'locales-obj/index.fr-x-psaccent.json';
      var psaccentFileInZip = zip.getEntry(psaccentPathInZip);

      assert.isNotNull(
        psaccentFileInZip,
        'Accented English file ' + psaccentPathInZip + ' should exist');
      assert.notDeepEqual(
        JSON.parse(zip.readAsText(psaccentFileInZip)),
        JSON.parse(zip.readAsText(enUSFileInZip)),
        'Accented English file should not be identical to regular English');
      done();
    });
  });

});

