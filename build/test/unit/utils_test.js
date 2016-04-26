'use strict';

var assert = require('chai').assert;
var utils = require('../../utils');
var sinon = require('sinon');

suite('utils.js', function() {
  setup(function() {
    this.sinon = sinon.sandbox.create();
  });

  teardown(function() {
    this.sinon.restore();
    this.sinon = null;
  });

  test('isSubjectToBranding', function () {
    var path = 'shared/resources/branding';
    assert.isTrue(utils.isSubjectToBranding(path));
  });

  test('isSubjectToDeviceType', function () {
    var path = 'locales/device_type';
    assert.isTrue(utils.isSubjectToDeviceType(path));
  });


  suite('getWebapp', function() {
    var appName, path, origin;

    var config = {
      GAIA_SCHEME: 'chrome://gaia/content/',
      STAGE_DIR: 'stage_dir',
      COREWEBAPPS_DIR: '/system'
    };

    setup(function() {
      appName = 'helloworld';
      path = 'some-path/' + appName;
      origin = 'http://app.helloworld.fr';

      this.sinon.stub(utils, 'getFile');
      utils.getFile.withArgs(appName).returns({
        exists: sinon.stub().returns(true),
        remove: sinon.stub(),
        isDirectory: sinon.stub.returns(false),
        isFile: sinon.stub.returns(true),
        isHidden: sinon.stub.returns(false),
        path: path,
        leafName: appName
      });

      utils.getFile.withArgs(path + '/manifest.webapp')
        .returns('magic-manifest-webapp');

      this.sinon.stub(utils, 'getJSON').withArgs('magic-manifest-webapp')
        .returns({
          name: appName
        });

      utils.getFile.withArgs(path, '..').returns({ leafName: '' });

      utils.getFile.withArgs(path, 'metadata.json').returns({
        exists: sinon.stub().returns(true),
        leafName: 'metadata.json'
      });

      utils.getJSON
        .withArgs(sinon.match.has('leafName', 'metadata.json'))
        .returns({});

      this.sinon.stub(utils, 'fileExists').returns(true);
      this.sinon.stub(utils, 'isExternalApp').returns(true);
      this.sinon.stub(utils, 'getUUIDMapping').returns({});
      this.sinon.stub(utils, 'getZip').returns({
        load: function() {},
        file: function() {
          return JSON.stringify({
            type: 'privileged',
            name: appName,
            origin: origin
          });
        }
      });
    });

    test('test', function() {
      var webapp = utils.getWebapp(appName, config);
      var directory = origin.replace(/^http:\/\//, '');

      var expected = {
        appDirPath: path,
        appStatus: 2,
        manifest: { name: appName },
        manifestFilePath: path + '/manifest.webapp',
        url: config.GAIA_SCHEME + appName,
        domain: appName,
        sourceDirectoryFilePath: path,
        sourceDirectoryName: appName,
        sourceAppDirectoryName: '',
        pckManifest: {
          type: 'privileged',
          name: appName,
          origin: origin
        },
        metaData: {},
        buildDirectoryFilePath: config.STAGE_DIR + '/' + appName,
        buildManifestFilePath:
          config.STAGE_DIR + '/' + appName + '/manifest.webapp',
        profileDirectoryFilePath:
          config.COREWEBAPPS_DIR + '/apps/' + directory
      };

      assert.deepEqual(webapp, expected);
    });
  });
});
