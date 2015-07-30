'use strict';

var assert = require('chai').assert;
var path = require('path');
var AdmZip = require('adm-zip');
var helper = require('./helper');

suite('Multilocale integration tests', function() {
  var localesDir = 'build/test/resources/locales';
  var localesFileObj = {'en-US': '', 'zh-CN': ''};

  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  function makeHelper(localesFilePath, localesDir, concat, done) {
    var settingsZipPath = path.join(process.cwd(), 'profile', 'webapps',
      'settings.gaiamobile.org', 'application.zip');
    var cnPathInZip = 'locales-obj/index.zh-CN.json';
    var cnSettingsProperties = 'locales/settings.zh-CN.properties';
    var langPathInZip = 'shared/resources/languages.json';

    var command = 'LOCALES_FILE=' + localesFilePath +
      ' LOCALE_BASEDIR=' + localesDir +
      ' make';

    if (!concat) {
      command = 'GAIA_CONCAT_LOCALES=0 ' + command;
    }

    helper.exec(command, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      var zip = new AdmZip(settingsZipPath);
      if (concat) {
        assert.isNotNull(zip.getEntry(cnPathInZip),
          'concat file ' + cnPathInZip + ' should exist');
      } else {
        assert.isNotNull(zip.getEntry(cnSettingsProperties),
          'properties file ' + cnSettingsProperties + ' should exist');
      }

      assert.deepEqual(JSON.parse(zip.readAsText(langPathInZip)),
        localesFileObj);
      var manifest =
        JSON.parse(zip.readAsText(zip.getEntry('manifest.webapp')));
      assert.equal(manifest.locales['en-US'].description, 'Gaia Settings');
      done();
    });
  }

  test('make with relative l10n path', function(done) {
    var localesFilePath = path.join(localesDir, 'languages.json');
    makeHelper(localesFilePath, localesDir, true, done);
  });

  test('make with absolute l10n path', function(done) {
    var localesFilePath =
      path.join(process.cwd(), localesDir, 'languages.json');
    var absoluteLocalesDir = path.join(process.cwd(), localesDir);
    makeHelper(localesFilePath, absoluteLocalesDir, true, done);
  });

  test('make with relative l10n path but without concat', function(done) {
    var localesFilePath = path.join(localesDir, 'languages.json');
    makeHelper(localesFilePath, localesDir, false, done);
  });

  test('make with absolute l10n path but without concat', function(done) {
    var localesFilePath =
      path.join(process.cwd(), localesDir, 'languages.json');
    var absoluteLocalesDir = path.join(process.cwd(), localesDir);
    makeHelper(localesFilePath, absoluteLocalesDir, false, done);
  });
});
