'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'WindowManager', 'Applications', 'ManifestHelper',
      'ActivityWindow', 'KeyboardManager', 'StatusBar',
      'SoftwareButtonManager', 'AttentionScreen', 'AppWindow',
      'OrientationManager', 'SettingsListener', 'BrowserFrame',
      'BrowserConfigHelper']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('system/ActivityWindow', function() {
  var reals = {};
  var activityWindow;
  var clock, stubById;
  var fakeConfig = {
    'url': 'app://fakeact.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity',
    'manifestURL': 'app://fakeact.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity'
    }
  };

  var fakeConfigWithOrientation = {
    'url': 'app://fakeact.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity',
    'manifestURL': 'app://fakeact.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity',
      'orientation': 'landscape'
    }
  };

  setup(function(done) {
    switchProperty(window, 'WindowManager', MockWindowManager, reals);
    switchProperty(window, 'SettingsListener', MockSettingsListener, reals);
    switchProperty(window, 'OrientationManager', MockOrientationManager, reals);
    switchProperty(window, 'Applications', MockApplications, reals);
    switchProperty(window, 'ManifestHelper', MockManifestHelper, reals);
    switchProperty(window, 'KeyboardManager', MockKeyboardManager, reals);
    switchProperty(window, 'StatusBar', MockStatusBar, reals);
    switchProperty(window, 'SoftwareButtonManager',
        MockSoftwareButtonManager, reals);
    switchProperty(window, 'AttentionScreen', MockAttentionScreen, reals);
    clock = sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/window.js');
    requireApp('system/js/activity_window.js', done);
  });

  teardown(function() {
    MockWindowManager.mTeardown();
    MockApplications.mTeardown();
    MockKeyboardManager.mTeardown();
    MockStatusBar.mTeardown();
    MockSoftwareButtonManager.mTeardown();
    MockAttentionScreen.mTeardown();
    clock.restore();
    stubById.restore();

    restoreProperty(window, 'OrientationManager', reals);
    restoreProperty(window, 'SettingsListener', reals);
    restoreProperty(window, 'AttentionScreen', reals);
    restoreProperty(window, 'SoftwareButtonManager', reals);
    restoreProperty(window, 'StatusBar', reals);
    restoreProperty(window, 'KeyboardManager', reals);
    restoreProperty(window, 'WindowManager', reals);
    restoreProperty(window, 'Applications', reals);
    restoreProperty(window, 'ManifestHelper', reals);
  });

  suite('activity window instance.', function() {
    var app, appF;
    setup(function() {
      app = new AppWindow({
        iframe: document.createElement('iframe'),
        frame: document.createElement('div'),
        origin: 'http://fake',
        url: 'http://fakeurl/index.html',
        manifestURL: 'http://fakemanifesturl',
        name: 'fake',
        manifest: {
          orientation: 'default'
        }
      });
      appF = new AppWindow({
        iframe: document.createElement('iframe'),
        frame: document.createElement('div'),
        origin: 'http://fake',
        url: 'http://fakeurl/index.html',
        manifestURL: 'http://fakemanifesturl',
        name: 'fake',
        manifest: {
          orientation: 'default',
          fullscreen: true
        }
      });
    });
    teardown(function() {
    });

    test('Render activity inside its caller', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      assert.deepEqual(activity.containerElement, app.element);
    });

    test('Activity created', function() {
      var created = false;
      window.addEventListener('activitycreated', function oncreated() {
        window.removeEventListener('activitycreated', oncreated);
        created = true;
      });
      activityWindow = new ActivityWindow(fakeConfig);
      assert.equal(
        activityWindow.browser.element.getAttribute('mozbrowser'),
        'true');
      assert.isTrue(created);
    });

    test('Activity resize chain', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity);
      var stubResize2 = this.sinon.stub(activity2, 'resize');
      app.resize();
      assert.isTrue(stubResize2.called);
      stubResize2.restore();
    });

    test('Activity orientate chain', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity);
      var stubSetOrientation2 = this.sinon.stub(activity2, 'setOrientation');
      app.setOrientation();
      assert.isTrue(stubSetOrientation2.called);
      stubSetOrientation2.restore();
    });

    test('Activity set orientation', function() {
      var activity = new ActivityWindow(fakeConfigWithOrientation, app);
      var stubIsActive = this.sinon.stub(activity, 'isActive');
      stubIsActive.returns(true);
      var stubLockOrientation;
      if ('lockOrientation' in screen) {
        stubLockOrientation = this.sinon.stub(screen, 'lockOrientation');
      } else if ('mozLockOrientation' in screen) {
        stubLockOrientation = this.sinon.stub(screen, 'mozLockOrientation');
      }
      activity.setOrientation();
      assert.isTrue(stubLockOrientation.calledWith('landscape'));
    });

    test('Event propagation should be stopped', function() {
      var activity1 = new ActivityWindow(fakeConfig, app);
      var evt = new CustomEvent('mozbrowseractivitydone');
      var spy1 = this.sinon.spy(evt, 'stopPropagation');
      activity1.element.dispatchEvent(evt);
      assert.isTrue(spy1.called);

      var activity2 = new ActivityWindow(fakeConfig, app);
      var evt = new CustomEvent('mozbrowserloadend');
      var spy2 = this.sinon.spy(evt, 'stopPropagation');
      activity2.element.dispatchEvent(evt);
      assert.isTrue(spy2.called);

      var activity3 = new ActivityWindow(fakeConfig, app);
      var evt = new CustomEvent('mozbrowservisibilitychange',
        {
          detail: { visible: true }
        });
      var spy3 = this.sinon.spy(evt, 'stopPropagation');
      activity3.element.dispatchEvent(evt);
      assert.isTrue(spy3.called);

      var activity4 = new ActivityWindow(fakeConfig, app);
      var evt = new CustomEvent('mozbrowsererror', {
        detail: { type: 'fatal' }
      });
      var spy4 = this.sinon.spy(evt, 'stopPropagation');
      activity4.element.dispatchEvent(evt);
      assert.isTrue(spy4.called);

      var activity5 = new ActivityWindow(fakeConfig, app);
      var evt = new CustomEvent('mozbrowserclose');
      var spy5 = this.sinon.spy(evt, 'stopPropagation');
      activity5.element.dispatchEvent(evt);
      assert.isTrue(spy5.called);
    });
  });
});
