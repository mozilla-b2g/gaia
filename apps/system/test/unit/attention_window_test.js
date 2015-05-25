/* globals AttentionWindow, MocksHelper, MockApplications,
           MockL10n, MockLayoutManager, MockManifestHelper, BaseModule,
           MockContextMenu */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_app_chrome.js');
requireApp('system/test/unit/mock_context_menu.js');
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
    origin: 'app://fakeatt.gaiamobile.org',
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
    MockApplications.mRegisterMockApp(fakeAttentionConfig);
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
    requireApp('system/js/base_module.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/attention_window.js', function() {
      this.sinon.stub(BaseModule, 'instantiate', function(name) {
        if (name === 'BrowserContextMenu') {
          return MockContextMenu;
        }
      });
      done();
    }.bind(this));
  });

  teardown(function() {
    window.layoutManager = realLayoutManager;
    navigator.mozL10n = realL10n;
    window.applications = realApplications;
    stubById.restore();
  });

  suite('attention window instance.', function() {
    test('show()', function() {
      var attention = new AttentionWindow(fakeAttentionConfig);
      this.sinon.stub(attention, '_resize');
      attention.show();
      assert.equal(attention.element.style.width, '');
      assert.isTrue(attention._resize.calledOnce, '_resize called.');
    });

    test('show should re-translate the fake notification', function() {
      var attention = new AttentionWindow(fakeAttentionConfig);
      this.sinon.stub(attention, '_resize');
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
      var attention = new AttentionWindow(fakeAttentionConfig);
      attention.destroy();
      assert.isNull(attention.notification);
    });

    test('make a fake notification', function() {
      var attention = new AttentionWindow(fakeAttentionConfig);
      assert.isNotNull(attention.notification);
      assert.isTrue(attention.notification.classList
                    .contains('attention-notification'));
    });

    test('translate the fake notification', function() {
      var attention = new AttentionWindow(fakeAttentionConfig);
      MockManifestHelper.prototype.name = 'translated';
      this.sinon.clock.tick(); // l10n ready
      assert.equal(attention.notificationTitle.textContent, 'translated');
    });

    test('ready', function() {
      var attention = new AttentionWindow(fakeAttentionConfig);
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
      var attention = new AttentionWindow(fakeAttentionConfig);
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
