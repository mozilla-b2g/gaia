var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var helper = require('./helper');

suite('psudolocalizations', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('build with GAIA_CONCAT_LOCALES=0 doesn\'t include pseudolocales', function(done) {
    helper.exec('GAIA_CONCAT_LOCALES=0 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'system.gaiamobile.org', 'application.zip');
      var zip = new AdmZip(zipPath);
      var qpsPlocPathInZip = 'locales-obj/qps-ploc.json';
      assert.isNull(zip.getEntry(qpsPlocPathInZip),
        'accented English file ' + qpsPlocPathInZip + ' should not exist');
      var qpsPlocmPathInZip = 'locales-obj/qps-plocm.json';
      assert.isNull(zip.getEntry(qpsPlocmPathInZip),
        'mirrored English file ' + qpsPlocmPathInZip + ' should not exist');
      done();
    });
  });

  test('build with GAIA_CONCAT_LOCALES=1 includes pseudolocales', function(done) {
    helper.exec('GAIA_CONCAT_LOCALES=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'system.gaiamobile.org', 'application.zip');
      var zip = new AdmZip(zipPath);
      var qpsPlocPathInZip = 'locales-obj/qps-ploc.json';
      assert.isNull(zip.getEntry(qpsPlocPathInZip),
          'accented English file ' + qpsPlocPathInZip + ' should not exist');
        var qpsPlocmPathInZip = 'locales-obj/qps-plocm.json';
        assert.isNull(zip.getEntry(qpsPlocmPathInZip),
          'mirrored English file ' + qpsPlocmPathInZip + ' should not exist');
        done();
      });
    });

});

