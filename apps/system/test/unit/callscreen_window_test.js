/* globals CallscreenWindow, MocksHelper, MockApplications,
           System, MockL10n */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_screen_layout.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksForCallscreenWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager', 'ScreenLayout', 'System'
]).init();

suite('system/CallscreenWindow', function() {
  mocksForCallscreenWindow.attachTestHelpers();
  var stubById;
  var realApplications;
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

  setup(function(done) {
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
    requireApp('system/js/attention_window.js');
    requireApp('system/js/callscreen_window.js', done);
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    window.applications = realApplications;
    stubById.restore();
  });

  test('Hide right away if we are not active while window.close()', function() {
    var callscreen = new CallscreenWindow();
    this.sinon.stub(callscreen, 'isActive').returns(false);
    callscreen.element.dispatchEvent(new CustomEvent('mozbrowserclose'));

    assert.isTrue(callscreen.isHidden());
  });

  test('Close while window.close() then hide', function() {
    var callscreen = new CallscreenWindow();
    this.sinon.stub(callscreen, 'isActive').returns(true);
    callscreen.element.dispatchEvent(new CustomEvent('mozbrowserclose'));
    callscreen.element.dispatchEvent(new CustomEvent('_closed'));
    assert.isTrue(callscreen.isHidden());
  });

  suite('> Call screen ensure', function() {
    suite('> When the lockscreen is unlocked', function() {
      test('it should open the call screen and force a hashchange',
      function() {
        var callscreen = new CallscreenWindow();
        callscreen.ensure();
        assert.equal(CSORIGIN + 'index.html#&timestamp=0',
                     callscreen.browser.element.src);
      });
    });

    suite('> When the lockscreen is locked', function() {
      setup(function() {
        System.locked = true;
      });

      teardown(function() {
        System.locked = false;
      });

      test('it should open the call screen on #locked', function() {
        var callscreen = new CallscreenWindow();
        callscreen.ensure();
        assert.equal(CSORIGIN + 'index.html#locked&timestamp=0',
                     callscreen.browser.element.src);
      });
    });
  });
});
