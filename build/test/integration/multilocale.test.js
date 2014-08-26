'use strict';
/* global require, suite, process, test, suiteSetup, teardown */
var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var path = require('path');
var AdmZip = require('adm-zip');
var helper = require('./helper');

suite('multilocale Integration tests', function() {
  var localesDir = 'build/test/resources/locales';
  var localesFileObj = {'en-US': '', 'zh-CN': ''};

  suiteSetup(function() {
    rmrf('profile');
  });

  function makeHelper(localesFilePath, localesDir, inlineAndConcat, done) {
    var settingsZipPath = path.join(process.cwd(), 'profile', 'webapps',
      'settings.gaiamobile.org', 'application.zip');
    var cnPathInZip = 'locales-obj/zh-CN.json';
    var cnSettingsProperties = 'locales/settings.zh-CN.properties';
    var langPathInZip = 'shared/resources/languages.json';

    var command = 'LOCALES_FILE=' + localesFilePath +
      ' LOCALE_BASEDIR=' + localesDir +
      ' make';

    if (!inlineAndConcat) {
      command = 'GAIA_INLINE_LOCALES=0 GAIA_CONCAT_LOCALES=0 ' + command;
    }

    // We were failing because the output from the gaia build process was
    // larger than the default maximum buffer size on Travis, so we explicitly
    // set a size here.  The default of 200kb is not enough.
    helper.exec(command, function(error, stdout, stderr) {

      helper.checkError(error, stdout, stderr);
      var zip = new AdmZip(settingsZipPath);
      if (inlineAndConcat) {
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

  test('make with relative l10n path',
    function(done) {
    var localesFilePath = path.join(localesDir, 'languages.json');
    makeHelper(localesFilePath, localesDir, true, done);
  });

  test('make with absolute l10n path',
    function(done) {
    var localesFilePath= path.join(process.cwd(), localesDir, 'languages.json');
    var absoluteLocalesDir = path.join(process.cwd(), localesDir);
    makeHelper(localesFilePath, absoluteLocalesDir, true, done);
  });

  test('make with relative l10n path but without inline & concat',
    function(done) {
    var localesFilePath = path.join(localesDir, 'languages.json');
    makeHelper(localesFilePath, localesDir, false, done);
  });

  test('make with absolute l10n path but without inline & concat',
    function(done) {
    var localesFilePath= path.join(process.cwd(), localesDir, 'languages.json');
    var absoluteLocalesDir = path.join(process.cwd(), localesDir);
    makeHelper(localesFilePath, absoluteLocalesDir, false, done);
  });

  teardown(function() {
    rmrf('profile');
  });
});
