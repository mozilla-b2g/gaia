'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var helper = require('./helper');

suite('Integration tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  function verifyIncludedFilesFromHtml(appName) {
    var folderPath = path.join(process.cwd(), 'profile', 'apps', appName);

    var folderEntries = helper.readdirSyncRecursive(folderPath);
    if (folderEntries.length === 0) {
      return;
    }

    for (var f = 0; f < folderEntries.length; f++) {
      var fileName = folderEntries[f];
      var extention =
        fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
      if (extention === 'html') {
        extractSharedFile(folderPath, folderEntries[f], appName);
      }
    }

    function extractSharedFile(folder, file, appName) {
      var SHARED_USAGE =
        /<(?:script|link).+=['"](\.?\.?\/?shared\/[^\/]+\/[^''\s]+)["']/g;
      var content = fs.readFileSync(path.join(folder, file),
                                    { encoding: 'utf-8' });
      var matches;
      while((matches = SHARED_USAGE.exec(content))!== null) {
        var filePathInHtml = matches[1];
        if (/\.(png|gif|jpg)$/.test(filePathInHtml)) {
          continue;
        }
        var fileInFolder = fs.readFileSync(path.join(folder, filePathInHtml));
        var fileInApps;
        if (filePathInHtml.indexOf('shared/') >= 0) {
          if (filePathInHtml.indexOf('../') === 0) {
            filePathInHtml = filePathInHtml.replace('../shared/', 'shared/');
          }
          fileInApps = fs.readFileSync(
            path.join(process.cwd(), filePathInHtml));
        } else {
          fileInApps = fs.readFileSync(path.join(process.cwd(),
            'apps', appName, filePathInHtml));
        }
        assert.deepEqual(fileInFolder, fileInApps, filePathInHtml);
      }
    }
  }

  function verifyIncludedImagesSize(appName, reso, official) {
    var folderPath = path.join(process.cwd(), 'profile', 'apps', appName);
    var folderEntries = helper.readdirSyncRecursive(folderPath);
    if (folderEntries.length === 0) {
      return;
    }

    for (var f = 0; f < folderEntries.length; f++) {
      var fileInFolder = folderEntries[f];
      var fileName = fileInFolder;
      if (/\.(png|gif|jpg)$/.test(fileName)) {
        // Manually modify the pathname of the browser branding images as
        // these are packaged differently than normal images.
        if (reso !== 1 &&
            fileName.indexOf('shared/resources/branding/browser_') === -1) {
          fileName = fileName.replace(
            /(.*)(\.(png|gif|jpg))$/, '$1@' + reso + 'x$2');
        }
        compareWithApps(appName, fileName, fileInFolder, reso, official);
      }
    }

    function compareWithApps(appName, filePath, fileEntry, reso, official) {
      var fileInApps;
      var fileOfFolder = fs.readFileSync(path.join(folderPath, fileEntry));
      if (filePath.indexOf('/branding/') !== -1) {
        filePath = filePath.replace('/branding/',
          official ? '/branding/official/' : '/branding/unofficial/');
      }
      if (filePath.indexOf('shared/') === 0) {
        filePath = path.join(process.cwd(), filePath);
      } else {
        filePath = path.join(process.cwd(), 'apps', appName, filePath);
      }

      if (fs.existsSync(filePath)) {
        fileInApps = fs.readFileSync(filePath);
      } else {
        filePath = filePath.replace('@' + reso + 'x', '');
        fileInApps = fs.readFileSync(filePath);
      }
      assert.deepEqual(fileOfFolder, fileInApps, filePath + ' no found');
    }
  }

  test('make APP=system, checking all of the files are available',
    function(done) {
      helper.exec('make APP=system', function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        verifyIncludedFilesFromHtml('system');
        verifyIncludedImagesSize('system', 1, false);
        done();
      });
    });

  test('make with GAIA_DEV_PIXELS_PER_PX=1.5', function(done) {
    helper.exec('GAIA_DEV_PIXELS_PER_PX=1.5 APP=system make ',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        verifyIncludedImagesSize('system', 1.5, false);
        done();
      }
    );
  });

  test('make app with custom origin', function(done) {
    // add custom-origin app to apps list
    var appsListPath  = path.join('build', 'config', 'phone',
      'apps-engineering.list');
    fs.renameSync(appsListPath, appsListPath + '.bak');
    fs.writeFileSync(appsListPath,
      'apps/*\nbuild/test/fixtures/custom-origin\n');

    var extConfigPath  = path.join('build', 'config',
      'additional-extensions.json');
    var restoreFunc = helper.emptyJsonFile(extConfigPath);

    helper.exec('DEBUG=1 make', function(error, stdout, stderr) {
      fs.unlinkSync(appsListPath);
      fs.renameSync(appsListPath + '.bak', appsListPath);

      helper.checkError(error, stdout, stderr);

      var webappsPath = path.join(process.cwd(), 'profile-debug',
        'apps', 'webapps.json');
      var webapps = JSON.parse(fs.readFileSync(webappsPath));

      assert.isNotNull(webapps['test.mozilla.com']);
      assert.equal(webapps['test.mozilla.com'].origin,
                   'chrome://gaia/content/test.mozilla.com');

      restoreFunc();
      done();
    });
  });
});
