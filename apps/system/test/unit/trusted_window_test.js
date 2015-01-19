/* global AppWindow, TrustedWindow, MocksHelper, MockApplications, BaseModule,
          MockContextMenu */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_chrome.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_context_menu.js');

requireApp('system/shared/test/unit/mocks/mock_screen_layout.js');

var mocksForActivityWindow = new MocksHelper([
  'Service', 'Applications', 'SettingsListener',
  'ManifestHelper', 'AppChrome'
]).init();

suite('system/TrustedWindow', function() {
  mocksForActivityWindow.attachTestHelpers();
  var stubById;
  var trustedWindow;
  var realApplications;
  var realModalDialog;
  var fakeTrustConfig = {
    name: 'Fake Activity',
    frame: document.createElement('iframe'),
    requestId: 'testrequestid',
    chromeId: 'testchromeid'
  };

  var fakeAppConfig = {
    iframe: document.createElement('iframe'),
    frame: document.createElement('div'),
    origin: 'http://fake',
    url: 'http://fakeurl/index.html',
    manifestURL: 'app://faketrusted.gaiamobile.org/manifest.webapp',
    name: 'fake',
    manifest: {
      orientation: 'default',
      icons: {
        '128': 'fake.icon'
      }
    }
  };

  var fakeModalDialog = { alert: function() {} };

  setup(function(done) {
    MockApplications.mRegisterMockApp(fakeAppConfig);
    realApplications = window.applications;
    window.applications = MockApplications;
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    this.sinon.stub(HTMLElement.prototype, 'querySelector',
    function() {
      return document.createElement('div');
    });
    realModalDialog = window.ModalDialog;
    window.ModalDialog = fakeModalDialog;
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/base_module.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/trusted_window.js', function() {
      this.sinon.stub(BaseModule, 'instantiate', function(name) {
        if (name === 'BrowserContextMenu') {
          return MockContextMenu;
        }
      });
      done();
    }.bind(this));
  });

  teardown(function() {
    window.applications = realApplications;
    window.ModalDialog = realModalDialog;
    stubById.restore();
  });

  suite('trusted window instance.', function() {
    var app;
    setup(function() {
      app = new AppWindow(fakeAppConfig);
      trustedWindow = new TrustedWindow(fakeTrustConfig, app);
    });

    test('init', function() {
      assert.deepEqual(trustedWindow.rearWindow, app);
      assert.deepEqual(trustedWindow.containerElement, app.element);
    });

    test('browser error', function() {
      var stubPublish = this.sinon.stub(trustedWindow, 'publish');
      var stubModalAlert = this.sinon.stub(window.ModalDialog, 'alert');
      var stubKill = this.sinon.stub(trustedWindow, 'kill');
      trustedWindow._handle_mozbrowsererror();
      assert.isTrue(stubPublish.calledWith('crashed'));
      assert.isTrue(stubModalAlert.calledWith('error-title', 'error-message'));
      assert.equal(stubModalAlert.getCall(0).args[2].title, 'close');
      stubModalAlert.getCall(0).args[2].callback();
      assert.isTrue(stubKill.calledOnce);
    });
  });
});
