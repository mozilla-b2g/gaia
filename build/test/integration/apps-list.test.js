/* global require, suite, test, process, suiteSetup, teardown */
'use strict';

var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var fs = require('fs');
var path = require('path');
var helper = require('./helper');

function checkAppList(expected, appConfigContent, done) {
  var listPath = path.join(process.cwd(), 'build_stage', 'apps.list');
  var appConfig = path.join(process.cwd(), 'build_stage', 'appsConfig.list');

  fs.writeFileSync(appConfig, appConfigContent);
  helper.exec('GAIA_DISTRIBUTION_DIR=customization ' +
    'GAIA_APP_CONFIG=' + appConfig +
    ' make apps-list', function(error, stdout, stderr) {
    helper.checkError(error, stdout, stderr);
    var appsList = fs.readFileSync(listPath, { encoding: 'utf8' });
    assert.deepEqual(appsList.split('\n').sort(), expected.sort());
    done();
  });
}

suite('Generating apps.list tests', function() {
  suiteSetup(function() {
    var stage = path.join(process.cwd(), 'build_stage');
    if (!fs.existsSync(stage)) {
      fs.mkdirSync(stage);
    }
  });

  test('wildcard test', function(done) {
    var expected = ['in_app_pay_test', 'marketplace-dev.allizom.org',
    'marketplace.allizom.org', 'mochitest'].map(function(dir) {
      return path.join(process.cwd(), 'test_external_apps', dir);
    });
    checkAppList(expected, 'test_external_apps/*', done);
  });

  test('specific app name', function(done) {
    var expected = ['system', 'keyboard'].map(function(dir) {
      return path.join(process.cwd(), 'apps', dir);
    });
    checkAppList(expected, 'apps/system\napps/keyboard', done);
  });

  test('specific app name in distribution dir', function(done) {
    rmrf(path.join(process.cwd(), 'customization', 'apps'));
    fs.mkdirSync(path.join(process.cwd(), 'customization', 'apps'));
    fs.mkdirSync(path.join(process.cwd(), 'customization', 'apps', 'test-app'));
    var expected = [path.join(process.cwd(), 'customization', 'apps',
      'test-app')];
    checkAppList(expected, 'apps/test-app', done);
  });

  teardown(function() {
    rmrf(path.join(process.cwd(), 'customization', 'apps'));
  });
});
