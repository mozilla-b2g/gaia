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
      var qpsPlocPathInZip = 'locales-obj/index.qps-ploc.json';
      var qpsPlocFileInZip = zip.getEntry(qpsPlocPathInZip);

      assert.isNotNull(
        qpsPlocFileInZip,
        'Accented English file ' + qpsPlocPathInZip + ' should exist');
      assert.notDeepEqual(
        JSON.parse(zip.readAsText(qpsPlocFileInZip)),
        JSON.parse(zip.readAsText(enUSFileInZip)),
        'Accented English file should not be identical to regular English');
      done();
    });
  });

});

