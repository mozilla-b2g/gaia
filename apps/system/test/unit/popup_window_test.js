/* global PopupWindow, MocksHelper, AppWindow, BaseModule, MockContextMenu */

'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_app_chrome.js');
requireApp('system/test/unit/mock_context_menu.js');

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
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      var element = document.createElement('div');
      if (id.indexOf('AppWindow') >= 0 || id.indexOf('PopupWindow') >= 0) {
        var container = document.createElement('div');
        container.className = 'browser-container';
        element.appendChild(container);
      }

      return element;
    });
    requireApp('system/js/service.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/base_module.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/popup_window.js', function() {
      this.sinon.stub(BaseModule, 'instantiate', function(name) {
        if (name === 'BrowserContextMenu') {
          return MockContextMenu;
        }
      });
      done();
    }.bind(this));
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

  test('requestClose should close directly', function() {
    app = new AppWindow(fakeAppConfig);
    var popup = new PopupWindow(fakePopupConfig);
    var stubClose = this.sinon.stub(popup, 'close');
    popup.requestClose();
    assert.isTrue(stubClose.called);
  });

  test('Theme color should be the one from the parent', function() {
    app = new AppWindow(fakeAppConfig);
    app.themeColor = 'black';
    fakePopupConfig.rearWindow = app;
    var popup = new PopupWindow(fakePopupConfig);
    assert.equal(app.themeColor, 'black');
    assert.equal(popup.themeColor, 'black');
    assert.equal(popup.element.classList.contains('light'),
      app.element.classList.contains('light'));
  });
});
