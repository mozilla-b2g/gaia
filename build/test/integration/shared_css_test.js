var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var helper = require('./helper');

suite('shared CSS', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  function verifyCopySharedCSS() {
    var testCSS = 'dev_apps/test-shared-css/style/main.css';
    var COMMENTED =
        /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm;
    var CSS_IMPORT =
        /@import (?:url\()?['"].*(shared\/[^\/]+\/[^'"\s]+)['"](?:\))?.*;$/gm;
    var content = fs.readFileSync(testCSS, { encoding: 'utf8' })
        .replace(COMMENTED, '');
    var matches = null;
    var includes = [];
    while ((matches = CSS_IMPORT.exec(content)) !== null) {
      includes.push(matches[1]);
    }

    var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'test-shared-css.gaiamobile.org', 'application.zip');
    var zip = new AdmZip(zipPath);
    var zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
      return;
    }

    var appFiles = [];
    for (var f = 0; f < zipEntries.length; f++) {
      appFiles.push(zipEntries[f].entryName);
    }
    assert.includeMembers(appFiles, includes, 'not include shared CSS');
  }

  test('make APP=test-shared-css, checking shared css are imported',
    function(done) {
      helper.exec('make APP=test-shared-css', function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        done();
      });
    });
});
