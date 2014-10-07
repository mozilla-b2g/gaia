var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var dive = require('dive');
var helper = require('./helper');

suite('Integration tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  function verifyIncludedFilesFromHtml(appName) {
    var used = {
      js: [],
      resources: [],
      style: [],
      style_unstable: [],
      locales: []
    };
    var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        appName + '.gaiamobile.org', 'application.zip');
    var zip = new AdmZip(zipPath);

    var zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
      return;
    }

    for (var f = 0; f < zipEntries.length; f++) {
      var fileName = zipEntries[f].entryName;
      var extention =
        fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
      if (extention === 'html') {
        var allShared = extractSharedFile(zip, zipEntries[f], appName);
      }
    }

    function extractSharedFile(zip, file, appName) {
      var SHARED_USAGE =
        /<(?:script|link).+=['"]\.?\.?\/?(shared\/[^\/]+\/[^''\s]+)["']/g;
      var content = zip.readAsText(file);
      while((matches = SHARED_USAGE.exec(content))!== null) {
        var filePathInHtml = matches[1];
        var fileInZip = zip.readFile(zip.getEntry(filePathInHtml));
        var fileInApps;
        if (/\.(png|gif|jpg)$/.test(filePathInHtml)) {
          continue;
        }
        if (filePathInHtml.indexOf('shared/') === 0) {
          fileInApps = fs.readFileSync(path.join(process.cwd(), filePathInHtml));
        } else {
          fileInApps = fs.readFileSync(path.join(process.cwd(),
            'apps', appName, filePathInHtml));
        }
        assert.deepEqual(fileInZip, fileInApps, filePathInHtml);
      }
    }
  }

  function verifyIncludedImagesSize(appName, reso, official) {
    var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        appName + '.gaiamobile.org', 'application.zip');
    var zip = new AdmZip(zipPath);
    var zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
      return;
    }

    var images = [];
    for (var f = 0; f < zipEntries.length; f++) {
      var fileInZip = zipEntries[f];
      var fileName = fileInZip.entryName;
      if (/\.(png|gif|jpg)$/.test(fileName)) {
        if (reso !== 1 && fileName.indexOf('browser_') === -1) {
          fileName = fileName.replace(
            /(.*)(\.(png|gif|jpg))$/, "$1@" + reso + "x$2");
        }
        compareWithApps(appName, fileName, fileInZip, reso, official);
      }
    }

    function compareWithApps(appName, filePath, fileEntry, reso, official) {
      var fileInApps;
      var fileOfZip = zip.readFile(fileEntry);
      if (filePath.indexOf('/branding/') !== -1) {
        filePath = filePath.replace('/branding/',
          official ? '/branding/official/' : '/branding/unofficial/');
      }
      if (filePath.indexOf('shared/') === 0) {
        filePath = path.join(process.cwd(), filePath);
      } else {
        filePath = path.join(process.cwd(), 'apps', appName, filePath)
      }

      if (fs.existsSync(filePath)) {
        fileInApps = fs.readFileSync(filePath);
      } else {
        filePath = filePath.replace('@' + reso + 'x', '');
        fileInApps = fs.readFileSync(filePath);
      }
      assert.deepEqual(fileOfZip, fileInApps, filePath + ' no found');
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
    fs.writeFileSync(appsListPath, 'apps/*\ndev_apps/custom-origin\n');

    var extConfigPath  = path.join('build', 'config',
      'additional-extensions.json');
    var restoreFunc = helper.emptyJsonFile(extConfigPath);

    helper.exec('DEBUG=1 make', function(error, stdout, stderr) {
      fs.unlinkSync(appsListPath);
      fs.renameSync(appsListPath + '.bak', appsListPath);

      helper.checkError(error, stdout, stderr);

      var webappsPath = path.join(process.cwd(), 'profile-debug',
        'webapps', 'webapps.json');
      var webapps = JSON.parse(fs.readFileSync(webappsPath));

      assert.isNotNull(webapps['test.mozilla.com']);
      assert.equal(webapps['test.mozilla.com'].origin, 'app://test.mozilla.com');

      restoreFunc();
      done();
    });
  });

  suite('Build file inclusion tests', function() {
    test('build includes elements folder and sim_picker', function(done) {
      helper.exec('make', function(error, stdout, stderr) {
        var pathInZip = 'shared/elements/sim_picker.html';
        var zipPath = path.join(process.cwd(), 'profile', 'webapps',
          'communications.gaiamobile.org', 'application.zip');
        var expectedSimPickerPath = path.join(process.cwd(),
          'shared', 'elements', 'sim_picker.html');
        helper.checkFileInZip(zipPath, pathInZip, expectedSimPickerPath);
        done();
      });
    });
  });

  test('make test-l10n-optimize build noFetch file', function(done) {
    helper.exec('APP=test-l10n-optimize make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var expectedScript = '<script type="application/l10n" lang="en-US">\n'+
                             '  {"entity1":"My Entity"}\n' +
                             '</script>';
        var testZip = new AdmZip(path.join(process.cwd(), 'profile',
          'webapps', 'test-l10n-optimize.gaiamobile.org', 'application.zip'));
        var indexHtml =
          testZip.readAsText(testZip.getEntry('index.html'));
        assert.ok(indexHtml.indexOf(expectedScript) !== -1);
        done();
      }
    );
  });
});
