var exec = require('child_process').exec;
var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var download = require('download');
var async = require('async');
var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var helper = require('./helper');

suite('multilocale Integration tests', function() {
  var localesDir = 'tmplocales';
  var localesFileObj = {};

  suiteSetup(function(done) {
    rmrf('profile');
    rmrf(localesDir);
    fs.mkdirSync(localesDir);

    var locales = ['en-US', 'zh-CN'];
    var tasks = locales.map(function(locale) {
      localesFileObj[locale] = '';
      return function (callback) {
        var dir = path.join(localesDir, locale);
        fs.mkdirSync(dir);
        var url = 'http://hg.mozilla.org/gaia-l10n/' + locale +
          '/archive/tip.tar.gz';
        var dl = download(url, dir, {extract: true, strip: 1});
        dl.once('close', function() {
          callback();
        });
      };
    });
    async.series(tasks, done);
  });

  function makeWithMultilocale(localesFilePath, localesDir, inlineAndConcat, done) {
    var settingsZipPath = path.join(process.cwd(), 'profile', 'webapps',
      'settings.gaiamobile.org', 'application.zip');
    var cnPathInZip = 'locales-obj/zh-CN.json';
    var cnSettingsProperties = 'locales/settings.zh-CN.properties';
    var cnTzIni = 'shared/locales/tz.ini';
    var langPathInZip = 'shared/resources/languages.json';


    fs.writeFileSync(localesFilePath, JSON.stringify(localesFileObj));
    var command = 'LOCALES_FILE=' + localesFilePath +
      ' LOCALE_BASEDIR=' + localesDir +
      ' make';

    if (!inlineAndConcat) {
      command = 'GAIA_INLINE_LOCALES=0 GAIA_CONCAT_LOCALES=0 ' + command;
    }

    exec(command, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      var zip = new AdmZip(settingsZipPath);
      if (inlineAndConcat) {
        assert.isNotNull(zip.getEntry(cnPathInZip),
          'cancat file ' + cnPathInZip + ' should exist');
      } else {
        assert.isNotNull(zip.getEntry(cnSettingsProperties),
          'properties file ' + cnSettingsProperties + ' should exist');
        assert.isNotNull(zip.getEntry(cnTzIni),
          'ini file ' + cnTzIni + ' should exist');
      }

      assert.deepEqual(JSON.parse(zip.readAsText(langPathInZip)), localesFileObj);
      done();
    });
  }

  test('make with relative l10n path', function(done) {
    var localesFilePath = path.join(localesDir, 'languages.json');
    makeWithMultilocale(localesFilePath, localesDir, true, done);
  });

  test('make with absolute l10 path', function(done) {
    var localesFilePath= path.join(process.cwd(), localesDir, 'languages.json');
    var absoluteLocalesDir = path.join(process.cwd(), localesDir);
    makeWithMultilocale(localesFilePath, absoluteLocalesDir, true, done);
  });

  test('make with relative l10n path but without inline & concat', function(done) {
    var localesFilePath = path.join(localesDir, 'languages.json');
    makeWithMultilocale(localesFilePath, localesDir, false, done);
  });

  test('make with absolute l10 path but without inline & concat', function(done) {
    var localesFilePath= path.join(process.cwd(), localesDir, 'languages.json');
    var absoluteLocalesDir = path.join(process.cwd(), localesDir);
    makeWithMultilocale(localesFilePath, absoluteLocalesDir, false, done);
  });

  teardown(function() {
    rmrf('profile');
  });

  suiteTeardown(function() {
    rmrf(localesDir);
  });
});
