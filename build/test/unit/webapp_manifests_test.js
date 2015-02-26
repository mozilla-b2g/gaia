'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('webapp-manifest.js', function() {
  var app;
  var fileExists;
  var writingContent = null;
  var isExternalApp = false;
  var mockConfig;
  var mockWebapp;
  setup(function() {
    var fileExists = false;
    app = proxyquire.noCallThru().load(
            '../../webapp-manifests', {
              './utils': mockUtils
            });

    mockUtils.getFileContent = function(file) {
      return file;
    };

    mockUtils.getFileAsDataURI = function(file) {
      return file.path;
    };

    mockUtils.ensureFolderExists = function(filePath) {
      return fileExists;
    };

    mockUtils.writeContent = function(file, content) {
      writingContent = content;
    };

    mockUtils.generateUUID = function() {
      return 'tewwtwuuid-1234';
    };

    mockUtils.getNewURI = function(origin) {
      return {
        host: origin + '_host',
        scheme: origin + '_scheme',
        prePath: origin
      };
    };

    mockUtils.isExternalApp = function(webapp) {
      return isExternalApp;
    };

    mockUtils.gaia = {
      getInstance: function(config) {
        return config;
      }
    };

    mockConfig = {
      GAIA_DIR: 'testGaiaDir',
      GAIA_DOMAIN: 'testGaiaDomain',
      GAIA_PORT: 'testGaiaPort',
      GAIA_SCHEME: 'testGaiaScheme',
      stageDir: 'testStageDir'
    };

    mockWebapp = {
      url: 'mockWebappUrl',
      appStatus: 'mockWebappAppStatus',
      manifest: 'mockWebappManifest',
      pckManifest: {
        origin: 'pckManifestOrigin'
      },
      metaData: {
        installOrigin: 'metaDataInstallOrigin',
        manifestURL: 'metaDataManifestURL',
        // origin: 'metaDataOrigin',
        removable: false,
        etag: 'metaDataEtag',
        packageEtag: 'metaDataPackageEtag'
      },
      sourceDirectoryName: 'sourceDirectoryName',
      domain: 'domain',
      profileDirectoryFilePath: 'testuuid'
    };
  });

  teardown(function() {
    fileExists = false;
    isExternalApp = false;
    writingContent = null;
  });

  suite('setConfig, genStageWebappJSON, fillExternalAppManifest', function() {
    var webappManifest;

    setup(function() {
      webappManifest = new app.ManifestBuilder();
      mockUtils.getFile = function(path) {
        return {
          leafName: path
        };
      };
    });

    test('setConfig', function() {
      webappManifest.setConfig(mockConfig);
      assert.equal(webappManifest.id, 1);
      assert.equal(webappManifest.stageDir, 'testStageDir');
    });

    test('genStageWebappJSON ', function() {
      var testStageManifests = {test: 'test'};
      var writingFilePath = '';
      webappManifest.stageManifests = testStageManifests;
      webappManifest.stageDir = {
        path: 'test_build_stage'
      };
      mockUtils.getFile = function() {
        for (var i in arguments) {
          writingFilePath += ('/' + arguments[i]);
        }
      };
      webappManifest.genStageWebappJSON();
      assert.equal(writingContent,
        JSON.stringify(testStageManifests, null, 2) + '\n');
      assert.equal(writingFilePath, '/test_build_stage/webapps_stage.json');
      mockUtils.getFile = null;
    });

    test('fillExternalAppManifest', function() {
      var test_uuid = 'testuuid';
      webappManifest.INSTALL_TIME = 'INSTALL_TIME';
      webappManifest.UPDATE_TIME = 'UPDATE_TIME';
      mockUtils.generateUUID = function() {
        return test_uuid;
      };
      webappManifest.setConfig(mockConfig);
      webappManifest.fillExternalAppManifest(mockWebapp);

      assert.deepEqual(webappManifest.stageManifests, {
        'sourceDirectoryName': {
          originalManifest: mockWebapp.manifest,
          origin: 'app://' + test_uuid,
          manifestURL: mockWebapp.metaData.manifestURL,
          installOrigin: mockWebapp.metaData.installOrigin,
          receipt: null,
          installTime: 'INSTALL_TIME',
          updateTime: 'UPDATE_TIME',
          removable: mockWebapp.metaData.removable,
          localId: 1,
          etag: mockWebapp.metaData.etag,
          packageEtag: mockWebapp.metaData.packageEtag,
          appStatus: mockWebapp.appStatus,
          webappTargetDirName: test_uuid
        }
      });
    });

    test('genManifest, when it is external webapp', function() {
      isExternalApp = false;
      webappManifest.INSTALL_TIME = 'INSTALL_TIME';
      webappManifest.UPDATE_TIME = 'UPDATE_TIME';
      webappManifest.setConfig(mockConfig);
      webappManifest.genManifest(mockWebapp);

      assert.deepEqual(webappManifest.stageManifests, {
        'sourceDirectoryName': {
          originalManifest: mockWebapp.manifest,
          origin: mockWebapp.url,
          manifestURL: mockWebapp.url + '/manifest.webapp',
          installOrigin: mockWebapp.url,
          receipt: null,
          installTime: 'INSTALL_TIME',
          updateTime: 'UPDATE_TIME',
          localId: 1,
          appStatus: mockWebapp.appStatus,
          webappTargetDirName: mockWebapp.domain
        }
      });
    });

    test('genManifest, when it is not external webapp', function() {
      isExternalApp = false;
      webappManifest.INSTALL_TIME = 'INSTALL_TIME';
      webappManifest.UPDATE_TIME = 'UPDATE_TIME';
      webappManifest.setConfig(mockConfig);
      webappManifest.genManifest(mockWebapp);

      assert.deepEqual(webappManifest.stageManifests, {
        'sourceDirectoryName': {
          originalManifest: mockWebapp.manifest,
          origin: mockWebapp.url,
          manifestURL: mockWebapp.url + '/manifest.webapp',
          installOrigin: mockWebapp.url,
          receipt: null,
          installTime: 'INSTALL_TIME',
          updateTime: 'UPDATE_TIME',
          localId: 1,
          appStatus: mockWebapp.appStatus,
          webappTargetDirName: mockWebapp.domain
        }
      });
    });
  });
});
