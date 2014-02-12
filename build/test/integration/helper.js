var assert = require('chai').assert;
var fs = require('fs');
var AdmZip = require('adm-zip');

function getPrefsSandbox() {
  var sandbox = {
    prefs: {},
    userPrefs: {},

    user_pref: function(key, value) {
      sandbox.userPrefs[key] = value;
    },

    pref: function(key, value) {
      sandbox.prefs[key] = value;
    }
  };
  return sandbox;
}

function checkError(error, stdout, stderr) {
  if (error) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    console.log('error: ' + error);
  }
  assert.equal(error, null);
}

function checkSettings(settings, expectedSettings) {
  Object.keys(expectedSettings).forEach(function(key) {
    assert.isDefined(settings[key], 'key ' + key + ' is defined');
    assert.deepEqual(expectedSettings[key], settings[key],
      'value of settings key ' + key + ' equal ' + expectedSettings[key]);
  });
}

function checkPrefs(actual, expected) {
  Object.keys(expected).forEach(function(key) {
    assert.isDefined(actual[key], 'key ' + key + ' is defined');
    assert.deepEqual(actual[key], expected[key], 'value of settings key ' +
      key + ' equal ' + expected[key]);
  });
}

function checkWebappsScheme(webapps) {
  Object.keys(webapps).forEach(function(key) {
    var webapp = webapps[key];
    var scheme =
      webapp.origin.indexOf('mochi.test') !== -1 ||
      webapp.origin.indexOf('marketplace.allizom.org') !== -1 ||
      webapp.origin.indexOf('inapp-pay-test.paas.allizom.org') !== -1 ?
      'http' : 'app';
    assert.equal(webapp.origin.indexOf(scheme), 0);
  });
}

function checkFileInZip(zipPath, pathInZip, expectedPath) {
  var expected = fs.readFileSync(expectedPath);
  var zip = new AdmZip(zipPath);
  var actual = zip.readFile(zip.getEntry(pathInZip));
  assert.deepEqual(actual, expected);
}

exports.getPrefsSandbox = getPrefsSandbox;
exports.checkError = checkError;
exports.checkSettings = checkSettings;
exports.checkPrefs = checkPrefs;
exports.checkWebappsScheme = checkWebappsScheme;
exports.checkFileInZip = checkFileInZip;
