'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
  require('./mock_utils.js');

suite('push-to-device.js', function() {
  var app;
  setup(function() {
      app = proxyquire.noCallThru().load(
              '../../push-to-device', {
                './utils': mockUtils
              });
      mockUtils.getFileContent = function(file) {
        return file;
      };
  });

  suite('pushToDevice, getPid and installSvoperapps', function() {
    var profileFolder = 'testProfileFolder';
    var remotePath = 'testRemotePath';

    test('pushToDevice without indexedDbFile', function(done) {
      mockUtils.getFile = function() {
        var args = Array.prototype.slice.call(arguments);
        var path = args.join('/');
        var indexDbFileExists = (path === profileFolder + '/indexedDB');
        return {
          exists: function() {
            return !indexDbFileExists;
          },
          isDirectory: function() {
            return !indexDbFileExists;
          },
          path: profileFolder + '/indexedDB'
        };
      };
      var queue = app.pushToDevice(profileFolder, remotePath, 'adb');
      queue.done(function() {
        assert.deepEqual(
          mockUtils.hasRunCommands,
          { sh: [
              '-c adb shell rm -r /' + remotePath + '/webapps',
              '-c adb shell rm //data/local/user.js',
              '-c adb push "' + profileFolder + '/webapps" /' + remotePath +
                '/webapps',
              '-c adb push "' + profileFolder +
                '/user.js" //data/local/user.js']
          }
        );
        done();
      });
    });

    test('pushToDevice with indexedDbFile', function(done) {
      mockUtils.getFile = function() {
        var args = Array.prototype.slice.call(arguments);
        var path = args.join('/');
        var indexDbFileExists = (path === profileFolder + '/indexedDB');
        return {
          exists: function() {
            return indexDbFileExists;
          },
          isDirectory: function() {
            return indexDbFileExists;
          },
          path: profileFolder + '/indexedDB'
        };
      };
      var queue = app.pushToDevice(profileFolder, remotePath, 'adb');
      queue.done(function() {
        assert.deepEqual(
          mockUtils.hasRunCommands,
          { sh: [
              '-c adb shell rm -r /' + remotePath + '/webapps',
              '-c adb shell rm //data/local/user.js',
              '-c adb push "' + profileFolder + '/webapps" /' + remotePath +
                '/webapps',
              '-c adb push "' + profileFolder +
                '/user.js" //data/local/user.js',
              '-c adb push "' + profileFolder +
                '/indexedDB" //data/local/indexedDB']
          }
        );
        done();
      });
    });

    test('installSvoperapps', function(done) {
      var queue = app.installSvoperapps(profileFolder, 'adb');
      queue.done(function() {
        assert.deepEqual(mockUtils.hasRunCommands, {
          sh: [
            '-c adb shell rm -r //data/local/svoperapps',
            '-c adb push "' + profileFolder +
              '/svoperapps" //data/local/svoperapps'
          ]
        });
        done();
      });
    });
  });

  suite('execute', function() {
    var options;
    var appID;
    setup(function() {
      options = {
        ADB: 'adb',
        GAIA_DIR: 'testGaia',
        PROFILE_DIR: 'testProfileFolder',
        GAIA_INSTALL_PARENT: '/system/b2g',
        GAIA_DOMAIN: 'testDomain'
      };
      appID = '999';
      mockUtils.getFile = function() {
        var args = Array.prototype.slice.call(arguments);
        var path = args.join('/');
        var profileExists = (path === options.PROFILE_DIR);
        return {
          exists: function() {
            return profileExists;
          },
          isDirectory: function() {
            return profileExists;
          },
          path: options.PROFILE_DIR
        };
      };
      mockUtils.readZipManifest = function() {
        return {
          name: options.BUILD_APP_NAME
        };
      };
    });

    test('execute, test it without assigning app name', function(done) {
      options.BUILD_APP_NAME = '*';
      var queue = app.execute(options);
      queue.done(function() {
        assert.deepEqual(mockUtils.hasRunCommands, {
          sh: [
            '-c adb start-server',
            '-c adb wait-for-device',
            '-c adb shell stop b2g',
            '-c adb shell rm -r //cache/*',
            '-c adb remount',
            '-c adb shell rm -r /' + options.GAIA_INSTALL_PARENT +
                '/webapps',
            '-c adb shell rm //data/local/user.js',
            '-c adb push "' + options.PROFILE_DIR + '/webapps"' +
                ' //system/b2g/webapps',
            '-c adb push "' + options.PROFILE_DIR + '/user.js"' +
              ' //data/local/user.js',
            '-c adb shell start b2g']});
        done();
      });
    });

    test('execute, test it with testApp as an app name', function(done) {
      options.BUILD_APP_NAME = 'testApp';
      mockUtils.psParser = function() {
        var pidMap = {};
        pidMap[options.BUILD_APP_NAME] = {
          PID: appID
        };
        return pidMap;
      };
      mockUtils.getPid = function(appName, gaiaDir) {
        return appID;
      };
      var queue = app.execute(options);
      queue.done(function() {
        assert.deepEqual(mockUtils.hasRunCommands, {
          sh: [
            '-c adb start-server',
            '-c adb wait-for-device',
            '-c adb shell rm -r //cache/*',
            '-c adb remount',
            '-c adb push "' + options.PROFILE_DIR + '/webapps/' +
                options.BUILD_APP_NAME + '.' + options.GAIA_DOMAIN +
                '/manifest.webapp" /' + options.GAIA_INSTALL_PARENT +
                '/webapps/' + options.BUILD_APP_NAME + '.' +
                options.GAIA_DOMAIN + '/manifest.webapp',
            '-c adb push "' + options.PROFILE_DIR + '/webapps/' +
                options.BUILD_APP_NAME + '.' + options.GAIA_DOMAIN +
                '/application.zip" /' + options.GAIA_INSTALL_PARENT +
                '/webapps/' + options.BUILD_APP_NAME + '.' +
                options.GAIA_DOMAIN + '/application.zip',
            '-c adb shell kill ' + appID]});
        done();
      });
    });
  });

  suite('getRemoteInstallPath', function() {
    test('Return /system/b2g if no profile on device', function() {
      var realGetJSON = mockUtils.getJSON;
      mockUtils.getJSON = function(file) {
        // getJSON should throw in this case because the content of the
        // tempFile will be an adb error message.
        return JSON.parse(
          'remote object \'' + file.path + '\' does not exist');
      };
      var path = app.getRemoteInstallPath('adb');
      assert.equal(path, '/system/b2g');

      mockUtils.getJSON = realGetJSON;
    });
    test('Return /data/local if no app was installed on /system/b2g',
      function() {
        var realGetJSON = mockUtils.getJSON;
        mockUtils.getJSON = function(file) {
          return {
            'app1.gaiamobile.org': {
              'basePath': '/data/local/webapps'
            },
            'app2.gaiamobile.org': {
              'basePath': '/data/local/webapps'
            },
            'app3.gaiamobile.org': {
              'basePath': '/data/local/webapps'
            }
          };
        };
        var path = app.getRemoteInstallPath('adb');
        assert.equal(path, '/data/local');

        mockUtils.getJSON = realGetJSON;
      });
    test('Return /system/b2g if any app was installed there', function() {
      var realGetJSON = mockUtils.getJSON;
      mockUtils.getJSON = function(file) {
        return {
          'app1.gaiamobile.org': {
            'basePath': '/data/local/webapps'
          },
          'app2.gaiamobile.org': {
            'basePath': '/system/b2g/webapps'
          },
          'app3.gaiamobile.org': {
            'basePath': '/system/b2g/webapps'
          }
        };
      };
      var path = app.getRemoteInstallPath('adb');
      assert.equal(path, '/system/b2g');

      mockUtils.getJSON = realGetJSON;
    });
  });

});
