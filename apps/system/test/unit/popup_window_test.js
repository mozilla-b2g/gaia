/* global PopupWindow, MocksHelper, AppWindow */

'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_app_chrome.js');

requireApp('system/shared/test/unit/mocks/mock_screen_layout.js');

var mocksForPopupWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'AppChrome'
]).init();

suite('system/PopupWindow', function() {
  mocksForPopupWindow.attachTestHelpers();
  var stubById;
  var fakeAppConfig = {
    iframe: document.createElement('iframe'),
    frame: document.createElement('div'),
    origin: 'http://fake',
    url: 'http://fakeurl/index.html',
    manifestURL: 'http://fakemanifesturl',
    name: 'fake',
    manifest: {
      orientation: 'default'
    }
  };
  var app, popup;

  var fakePopupConfig = {
    'url': 'app://popup.gaiamobile.org/popup.html',
    'name': 'Fake Popup',
    'origin': 'app://popup.gaiamobile.org',
    'rearWindow': app
  };

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/popup_window.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  test('should instantiate an app chrome', function() {
    var spy = this.sinon.spy(window, 'AppChrome');
    app = new AppWindow(fakeAppConfig);
    popup = new PopupWindow(fakePopupConfig);
    assert.isTrue(spy.calledWithNew());
  });

  test('requestOpen should open directly', function() {
    app = new AppWindow(fakeAppConfig);
    var popup = new PopupWindow(fakePopupConfig);
    var stubOpen = this.sinon.stub(popup, 'open');
    popup.requestOpen();
    assert.isTrue(stubOpen.called);
  });

  test('requst close should close directly', function() {
    app = new AppWindow(fakeAppConfig);
    var popup = new PopupWindow(fakePopupConfig);
    var stubClose = this.sinon.stub(popup, 'close');
    popup.requestClose();
    assert.isTrue(stubClose.called);
  });
});
