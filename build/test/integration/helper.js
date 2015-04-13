'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var AdmZip = require('adm-zip');
var childProcess = require('child_process');
var rmrf = require('rimraf').sync;

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
    assert.deepEqual(settings[key], expectedSettings[key],
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
  var configKeys = ['origin', 'installOrigin', 'receipt', 'installTime',
                    'updateTime', 'manifestURL', 'localId', 'appStatus'];

  Object.keys(webapps).forEach(function(key) {
    var webapp = webapps[key];
    configKeys.forEach(function(configKey) {
      assert.equal((configKey in webapp), true,
        key + ' of webapps.json has not defined ' + configKey);
    });
    var scheme =
      webapp.origin.indexOf('mochi.test') !== -1 ?
      'http' : 'app';
    assert.equal(webapp.origin.indexOf(scheme), 0);
  });
}

function checkFilePathInZip(zipPath, expectedPath) {
  var zip = new AdmZip(zipPath);
  var entries = zip.getEntries();
  var result = entries.some(function(entry) {
    return entry.entryName.indexOf(expectedPath) !== -1;
  });
  assert.ok(result, 'Checking ' + expectedPath + ' in ' + zipPath);
}

function checkFileInZip(zipPath, pathInZip, expectedPath) {
  var stat = fs.statSync(expectedPath);
  if (stat && stat.isDirectory()) {
    var list = fs.readdirSync(expectedPath);
    list.forEach(function(filename) {
      checkFileInZip(
        zipPath, pathInZip + '/' + filename, expectedPath + '/' + filename);
    });

    return;
  }

  var expected = fs.readFileSync(expectedPath);
  checkFileContentInZip(zipPath, pathInZip, expected);
}

function checkFileContentInZip(zipPath, pathInZip, expectedContent, isJSON) {
  var zip = new AdmZip(zipPath);
  var entry = zip.getEntry(pathInZip);
  var actual = isJSON ? JSON.parse(zip.readAsText(entry)) : zip.readFile(entry);
  assert.deepEqual(actual, expectedContent,
    'Checking ' + pathInZip + ' in ' + zipPath);
}

function checkFileContentByPathInZip(zipPath, pathInZip,
  expectedFilePath,isJSON) {
    var actual;
    try {
      actual =
        isJSON ? JSON.parse(fs.readFileSync(expectedFilePath)) :
        fs.readFileSync(expectedFilePath);
    } catch (e) {
      actual = isJSON ? {} : null;
    }
    checkFileContentInZip(zipPath, pathInZip, actual, isJSON);
}

function matchFileContentInZip(zipPath, pathInZip, matchPattern) {
  var zip = new AdmZip(zipPath);
  var entry = zip.getEntry(pathInZip);
  var content = zip.readAsText(entry);
  assert.ok(matchPattern.test(content));
}

function exec(command, options, callback) {
  var opts = {
    maxBuffer: 400 * 1024
  };
  if (typeof options !== 'function') {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        opts[key] = options[key];
      }
    }
  } else {
    callback = options;
  }

  childProcess.exec(command, opts, callback);
}

function emptyJsonFile(filePath) {
  var content = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);
  fs.writeFileSync(filePath, '{}');

  var restoreFunc = function() {
    fs.writeFileSync(filePath, content);
  };

  return restoreFunc;
}

function cleanupWorkspace() {
  rmrf('profile');
  rmrf('profile-debug');
  rmrf('build_stage');
  fs.writeFileSync('all.mk', '');
  rmrf(exports.localesDir);
}

exports.localesDir = 'tmplocales';
exports.getPrefsSandbox = getPrefsSandbox;
exports.checkError = checkError;
exports.checkSettings = checkSettings;
exports.checkPrefs = checkPrefs;
exports.checkWebappsScheme = checkWebappsScheme;
exports.checkFilePathInZip = checkFilePathInZip;
exports.checkFileInZip = exports.checkDirInZip = checkFileInZip;
exports.checkFileContentInZip = checkFileContentInZip;
exports.checkFileContentByPathInZip = checkFileContentByPathInZip;
exports.matchFileContentInZip = matchFileContentInZip;
exports.emptyJsonFile = emptyJsonFile;
exports.exec = exec;
exports.cleanupWorkspace = cleanupWorkspace;
