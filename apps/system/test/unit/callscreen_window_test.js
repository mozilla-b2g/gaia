/* globals CallscreenWindow, MocksHelper, MockApplications, MockLayoutManager,
           Service, MockL10n */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_app_chrome.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksForCallscreenWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager', 'ScreenLayout', 'Service',
  'AppChrome'
]).init();

suite('system/CallscreenWindow', function() {
  mocksForCallscreenWindow.attachTestHelpers();
  var stubById;
  var realApplications;
  var realLayoutManager;
  var realL10n;
  var CSORIGIN = window.location.origin.replace('system', 'callscreen') + '/';
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

  fakeAppConfig.browser = { element: fakeAppConfig.iframe };

  setup(function(done) {
    MockApplications.mRegisterMockApp(fakeAppConfig);
    realApplications = window.applications;
    window.applications = MockApplications;
    realLayoutManager = window.layoutManager;
    window.layoutManager = new MockLayoutManager();
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
    requireApp('system/js/attention_window.js');
    requireApp('system/js/callscreen_window.js', done);
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    window.applications = realApplications;
    window.layoutManager = realLayoutManager;
    stubById.restore();
  });

  test('Should be an attention window', function() {
    var callscreen = new CallscreenWindow();
    assert.isTrue(callscreen.isAttentionWindow);
  });

  test('Hide right away if we are not active while window.close()', function() {
    var callscreen = new CallscreenWindow();
    this.sinon.stub(callscreen, 'isActive').returns(false);
    callscreen.element.dispatchEvent(new CustomEvent('mozbrowserclose'));

    assert.isTrue(callscreen.isHidden());
  });

  test('Close while window.close() then hide', function() {
    var callscreen = new CallscreenWindow();
    var stubPublish = this.sinon.stub(callscreen, 'publish');
    this.sinon.stub(callscreen, 'isActive').returns(true);
    var stubBlur = this.sinon.stub(callscreen.browser.element, 'blur');
    var stubReloadWindow = this.sinon.stub(callscreen, 'reloadWindow');
    callscreen.element.dispatchEvent(new CustomEvent('mozbrowserclose'));
    assert.isTrue(stubPublish.calledWith('terminated'));
    assert.isFalse(stubReloadWindow.called);
    callscreen.element.dispatchEvent(new CustomEvent('_closed'));
    assert.isTrue(callscreen.isHidden());
    assert.isTrue(stubReloadWindow.called);
    if (document.activeElement === callscreen.browser.element) {
      assert.isTrue(stubBlur.called);
    }
  });

  test('Hide and reload right away while window.close() when we are not active',
    function() {
      var callscreen = new CallscreenWindow();
      this.sinon.stub(callscreen, 'isActive').returns(false);
      var stubBlur = this.sinon.stub(callscreen.browser.element, 'blur');
      var stubReloadWindow = this.sinon.stub(callscreen, 'reloadWindow');
      callscreen.element.dispatchEvent(new CustomEvent('mozbrowserclose'));
      assert.isTrue(callscreen.isHidden());
      assert.isTrue(stubReloadWindow.called);
      if (document.activeElement === callscreen.browser.element) {
        assert.isTrue(stubBlur.called);
      }
    });

  suite('> Call screen ensure', function() {
    suite('> When the lockscreen is unlocked', function() {
      test('it should open the call screen and force a hashchange',
      function() {
        var callscreen = new CallscreenWindow();
        this.sinon.stub(callscreen, 'show');
        callscreen.ensure();
        assert.equal(CSORIGIN + 'index.html#&timestamp=0',
                     callscreen.browser.element.src);
        assert.isTrue(callscreen.show.calledOnce,
          'AttentionWindow#show called.');
      });
    });

    suite('> When the lockscreen is locked', function() {
      setup(function() {
        Service.mockQueryWith('locked', true);
      });

      teardown(function() {
        Service.mockQueryWith('locked', false);
      });

      test('it should open the call screen on #locked', function() {
        var callscreen = new CallscreenWindow();
        this.sinon.stub(callscreen, 'show');
        callscreen.ensure();
        assert.equal(CSORIGIN + 'index.html#locked&timestamp=0',
                     callscreen.browser.element.src);
        assert.isTrue(callscreen.show.calledOnce,
          'AttentionWindow#show called.');
      });
    });
  });

  suite('reloading the window', function() {
    var subject;
    setup(function() {
      subject = new CallscreenWindow();
      subject.browser.element = {
        src: 'app://callscreen.gaiamobile.org/index.html#stuff',
        classList: {
          contains: function() { return true; }
        }
      };
      this.sinon.spy(subject, 'setVisible');

      subject.reloadWindow();
    });

    test('should empty the src at first', function() {
      assert.equal(subject.browser.element.src, '');
    });

    test('should set the visibility to false', function() {
      sinon.assert.calledOnce(subject.setVisible);
      sinon.assert.calledWith(subject.setVisible, false);
    });

    test('should reset the src after a tick', function() {
      this.sinon.clock.tick();
      assert.equal(subject.browser.element.src,
                   'app://callscreen.gaiamobile.org/index.html');
    });
  });
});
