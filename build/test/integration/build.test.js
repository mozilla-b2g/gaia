var exec = require('child_process').exec;
var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var download = require('download');
var async = require('async');
var fs = require('fs');
var path = require('path');

function checkError(error, stdout, stderr) {
  if (error) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    console.log('error: ' + error);
  }
  assert.equal(error, null);
}

suite('Build Integration tests', function() {
  var localesDir = 'tmplocales';

  suiteSetup(function() {
    rmrf('profile');
    rmrf('profile-debug');
    rmrf(localesDir);
  });

  test('make without rule & variable', function(done) {
    exec('make', function(error, stdout, stderr) {
      checkError(error, stdout, stderr);
      done();
    });
  });

  test('make with PRODUCTION=1', function(done) {
    exec('PRODUCTION=1 make', function(error, stdout, stderr) {
      checkError(error, stdout, stderr);
      done();
    });
  });

  test('make with SIMULATOR=1', function(done) {
    exec('SIMULATOR=1 make', function(error, stdout, stderr) {
      checkError(error, stdout, stderr);
      done();
    });
  });

  test('make with DEBUG=1', function(done) {
    exec('DEBUG=1 make', function(error, stdout, stderr) {
      checkError(error, stdout, stderr);
      done();
    });
  });

  test('make with MOZILLA_OFFICIAL=1', function(done) {
    exec('MOZILLA_OFFICIAL=1 make', function(error, stdout, stderr) {
      checkError(error, stdout, stderr);
      done();
    });
  });

  test('make with GAIA_DISTRIBUTION_DIR=distribution_tablet', function(done) {
    exec('GAIA_DISTRIBUTION_DIR=distribution_tablet make',
      function(error, stdout, stderr) {
        checkError(error, stdout, stderr);
        done();
      }
    );
  });

  test('make with l10n configuration', function(done) {
    var locales = ['en-US', 'zh-CN'];
    var localesFileObj = {};
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

    tasks.push(function(callback) {
      localesFilePath = path.join(localesDir, 'languages.json');
      fs.writeFileSync(localesFilePath, JSON.stringify(localesFileObj));
      command = 'LOCALES_FILE=' + localesFilePath +
        ' LOCALE_BASEDIR=' + localesDir +
        ' make';
      exec(command, function(error, stdout, stderr) {
        checkError(error, stdout, stderr);
        callback();
      });
    });
    fs.mkdirSync(localesDir);
    async.series(tasks, function() {
      rmrf(localesDir);
      done();
    });
  });

  teardown(function() {
    rmrf('profile');
    rmrf('profile-debug');
  });
});
