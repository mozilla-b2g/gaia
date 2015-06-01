'use strict';
/* global applications */
/* global MockApplications */
/* global MocksHelper */
/* global MockSettingsListener */
/* global SettingsListener */
/* global SearchWindow */
/* global MockAppWindow */

requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocks = new MocksHelper([
  'Applications',
  'ManifestHelper',
  'OrientationManager',
  'SettingsListener'
]).init();

suite('system/SearchWindow', function() {
  mocks.attachTestHelpers();

  var realApplications;
  var fakeElement;
  var stubById;

  setup(function(done) {
    realApplications = window.applications;
    window.applications = MockApplications;

    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));

    requireApp('system/js/service.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/search_window.js', done);
  });

  teardown(function() {
    stubById.restore();
    window.applications = realApplications;
    realApplications = null;
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('constructor', function() {
    var searchWindow = new SearchWindow();
    assert.ok(searchWindow.constructor === SearchWindow,
      'Uses the SearchWindow constructor');
  });

  test('destroy - unobserves setting', function() {
    var subject = new SearchWindow();
    this.sinon.spy(SettingsListener, 'unobserve');
    subject.destroy();
    sinon.assert.calledWith(SettingsListener.unobserve,
      'rocketbar.searchAppURL', subject._setBrowserConfig);
  });

  test('setBrowserConfig', function() {
    var searchWindow = new SearchWindow();

    this.sinon.stub(applications, 'getByManifestURL').returns({
      origin: 'app://mozilla.org',
      manifestURL: 'app://mozilla.org/manifest.webapp',
      manifest: {}
    });

    var renderStub = this.sinon.stub(searchWindow, 'render');
    var openStub = this.sinon.stub(searchWindow, 'open');

    MockSettingsListener.mCallbacks['rocketbar.searchAppURL'](
      'app://mozilla.org/');

    assert.ok(renderStub.calledOnce);
    assert.ok(openStub.calledOnce);
    assert.equal(searchWindow.manifestURL, 'app://mozilla.org/manifest.webapp');
    assert.equal(searchWindow.searchAppURL, 'app://mozilla.org/');
  });

  test('request close should close directly', function() {
    var searchWindow = new SearchWindow();
    var stubClose = this.sinon.stub(searchWindow, 'close');
    searchWindow.requestClose();
    assert.isTrue(stubClose.called);
  });

  test('call lockOrientation', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    window.appWindowManager = {
      getActiveApp: function() {
        return app1;
      }
    };
    var searchWindow = new SearchWindow();
    this.sinon.stub(app1, 'setOrientation');
    searchWindow.lockOrientation();
    assert.isTrue(app1.setOrientation.calledOnce,
      'should lock orientation to root app');
  });
});
