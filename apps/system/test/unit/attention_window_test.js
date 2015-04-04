/* globals AttentionWindow, MocksHelper, AppWindow, MockApplications,
            MockL10n, MockLayoutManager, MockManifestHelper */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_app_chrome.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForAttentionWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager', 'ScreenLayout',
  'AppChrome'
]).init();

suite('system/AttentionWindow', function() {
  mocksForAttentionWindow.attachTestHelpers();
  var stubById;
  var realApplications, realLayoutManager;
  var realL10n;
  var fakeAttentionConfig = {
    'url': 'app://fakeatt.gaiamobile.org/pick.html',
    'manifestURL': 'app://fakeatt.gaiamobile.org/manifest.webapp',
    iframe: document.createElement('iframe'),
    origin: 'app://fakeatt.gaiamobile.org'
  };
  var fakeAppConfig = {
    iframe: document.createElement('iframe'),
    frame: document.createElement('div'),
    origin: 'http://fake',
    url: 'http://fakeurl/index.html',
    manifestURL: 'app://fakeatt.gaiamobile.org/manifest.webapp',
    name: 'fake',
    manifest: {
      orientation: 'default',
      icons: {
        '128': 'fake.icon'
      }
    }
  };

  setup(function(done) {
    realLayoutManager = window.layoutManager;
    window.layoutManager = new MockLayoutManager();
    MockApplications.mRegisterMockApp(fakeAppConfig);
    realApplications = window.applications;
    window.applications = MockApplications;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    this.sinon.stub(HTMLElement.prototype, 'querySelector',
    function() {
      return document.createElement('div');
    });
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/attention_window.js', done);
  });

  teardown(function() {
    window.layoutManager = realLayoutManager;
    navigator.mozL10n = realL10n;
    window.applications = realApplications;
    stubById.restore();
  });

  suite('attention window instance.', function() {
    var app;
    setup(function() {
      app = new AppWindow(fakeAppConfig);
    });

    test('show()', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      attention.show();
      assert.equal(attention.element.style.width, '');
    });

    test('show should re-translate the fake notification', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      MockManifestHelper.prototype.name = 'translated';
      this.sinon.clock.tick(); // l10n ready
      assert.equal(attention.notificationTitle.textContent, 'translated');

      attention.show();
      MockManifestHelper.prototype.name = 'translated by show';
      this.sinon.clock.tick(); // l10n ready
      assert.equal(attention.notificationTitle.textContent,
                   'translated by show');
    });

    test('clear the fake notification node when removed.', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      attention.destroy();
      assert.isNull(attention.notification);
    });

    test('make a fake notification', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      assert.isNotNull(attention.notification);
      assert.isTrue(attention.notification.classList
                    .contains('attention-notification'));
    });

    test('translate the fake notification', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      MockManifestHelper.prototype.name = 'translated';
      this.sinon.clock.tick(); // l10n ready
      assert.equal(attention.notificationTitle.textContent, 'translated');
    });

    test('ready', function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      var callback1 = this.sinon.spy();
      attention.loaded = false;
      attention.ready(callback1);
      attention.element.dispatchEvent(new CustomEvent('_loaded'));
      this.sinon.clock.tick(0);
      assert.isTrue(callback1.called);

      var callback2 = this.sinon.spy();
      attention.loaded = true;
      var stubTryWaitForFullRepaint =
        this.sinon.stub(attention, 'tryWaitForFullRepaint');
      attention.ready(callback2);
      stubTryWaitForFullRepaint.getCall(0).args[0]();
      this.sinon.clock.tick(0);
      assert.isTrue(callback2.called);
    });

    test('_languagechange should re-translate the fake notification',
    function() {
      var attention = new AttentionWindow(fakeAttentionConfig, app);
      MockManifestHelper.prototype.name = 'translated';
      this.sinon.clock.tick(); // l10n ready
      assert.equal(attention.notificationTitle.textContent, 'translated');

      attention.element.dispatchEvent(new CustomEvent('_languagechange'));
      MockManifestHelper.prototype.name = 'translated by languagechange';
      this.sinon.clock.tick(); // l10n ready
      assert.equal(attention.notificationTitle.textContent,
                   'translated by languagechange');
    });
  });
});
