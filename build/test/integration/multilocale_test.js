'use strict';

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');
var helper = require('./helper');

suite('Multilocale integration tests', function() {
  var localesDir = 'build/test/resources/locales';
  // var localesFileObj = {'en-US': '', 'zh-CN': ''};

  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  function makeHelper(localesFilePath, localesDir, concat, done) {
    var settingsFolderPath = path.join(process.cwd(), 'profile', 'apps',
      'settings');
    var cnPathInFolder = 'locales-obj/index.zh-CN.json';
    var cnSettingsProperties = 'locales/settings.zh-CN.properties';
    // var langPathInFolder = 'shared/resources/languages.json';

    var command = 'LOCALES_FILE=' + localesFilePath +
      ' LOCALE_BASEDIR=' + localesDir +
      ' make';

    if (!concat) {
      command = 'GAIA_CONCAT_LOCALES=0 ' + command;
    }

    helper.exec(command, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      if (concat) {
        assert.isTrue(
          fs.existsSync(path.join(settingsFolderPath, cnPathInFolder)),
          'concat file ' + cnPathInFolder + ' should exist');
      } else {
        assert.isTrue(
          fs.existsSync(path.join(settingsFolderPath, cnSettingsProperties)),
          'properties file ' + cnSettingsProperties + ' should exist');
      }

      // FIXME: Broken because of Bug 1268477
      // assert.deepEqual(
      //   JSON.parse(
      //     fs.readFileSync(
      //       path.join(settingsFolderPath, '..', langPathInFolder),
      //       { encoding: 'utf-8' })),
      //   localesFileObj);
      var manifest =
        JSON.parse(
          fs.readFileSync(path.join(settingsFolderPath, 'manifest.webapp'),
                          { encoding: 'utf-8' }));
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
