'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var helper = require('./helper');

suite('L10n logic tests', function() {
  var appsListPath  = path.join(
    'build', 'config', 'phone', 'apps-engineering.list');
  var apps = [
    'apps/*',
    'build/test/fixtures/test-l10n-optimize-entries',
    'build/test/fixtures/test-l10n-optimize-legacy',
    'build/test/fixtures/test-l10n-optimize-no-fetch',
    'build/test/fixtures/test-l10n-missing',
    'build/test/fixtures/test-l10n-duplicates',
    '' // a line-break is required at the end of an apps file
  ];

  suiteSetup(function() {
    helper.cleanupWorkspace();

    // add test-l10n-* apps to the apps list
    fs.renameSync(appsListPath, appsListPath + '.bak');
    fs.writeFileSync(appsListPath, apps.join('\n'));
  });

  suiteTeardown(function() {
    fs.unlinkSync(appsListPath);
    fs.renameSync(appsListPath + '.bak', appsListPath);
    helper.cleanupWorkspace();
  });

  test('make test-l10n-optimize-entries builds JSON', function(done) {
    helper.exec('APP=test-l10n-optimize-entries make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        var expected = {entity1: 'My Entity', entity2: 'Entity 2'};
        var testFolder = path.join(
          process.cwd(), 'profile', 'apps', 'test-l10n-optimize-entries');
        var entries = JSON.parse(fs.readFileSync(
          path.join(testFolder, 'locales-obj/index.en-US.json')));
        assert.deepEqual(entries, expected);
        done();
      }
    );
  });

  test('make test-l10n-optimize-legacy builds legacy JSON', function(done) {
    helper.exec('APP=test-l10n-optimize-legacy make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        var expected = [{'$i':'entity1','$v':'My Entity'}];
        var testFolder = path.join(
          process.cwd(), 'profile', 'apps', 'test-l10n-optimize-legacy');
        var entries = JSON.parse(fs.readFileSync(
          path.join(testFolder, 'locales-obj/index.en-US.json')));
        assert.deepEqual(entries, expected);
        done();
      }
    );
  });

  test('make test-l10n-optimize-no-fetch build noFetch file', function(done) {
    helper.exec('APP=test-l10n-optimize-no-fetch make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var expectedScript = '<script type="application/l10n" lang="en-US">\n'+
                             '  [{"$i":"entity1","$v":"My Entity"}]\n' +
                             '</script>';
        var testFolder = path.join(
          process.cwd(), 'profile', 'apps', 'test-l10n-optimize-no-fetch');
        var indexHtml = fs.readFileSync(path.join(testFolder, 'index.html'));
        assert.ok(indexHtml.indexOf(expectedScript) !== -1);
        done();
      }
    );
  });

  test('make test-l10n-missing detects a missing string', function(done) {
    helper.exec('APP=test-l10n-missing make',
      function(error, stdout, stderr) {
        assert.include(
          stdout,
          '[Error] L10nError: "entity0" not found in en-US ' +
            '(chrome://gaia/content/test-l10n-missing)');
        done();
      }
    );
  });

  test('make test-l10n-duplicates detects a duplicate string', function(done) {
    helper.exec('APP=test-l10n-duplicates make',
      function(error, stdout, stderr) {
        assert.include(
          stdout,
          '[Error] L10nError: Duplicate string "entity1" found in en-US ' +
            '(chrome://gaia/content/test-l10n-duplicates)');
        done();
      }
    );
  });
});
