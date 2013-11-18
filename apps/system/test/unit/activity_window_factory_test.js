'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'WindowManager', 'Applications', 'ManifestHelper',
      'ActivityWindow', 'KeyboardManager', 'StatusBar',
      'SoftwareButtonManager', 'AttentionScreen', 'AppWindow',
      'ActivityWindowFactory', 'OrientationManager', 'BrowserFrame',
      'BrowserConfigHelper']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

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

suite('system/ActivityWindowFactory', function() {
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

  var fakeConfig2 = {
    'url': 'app://fakeact2.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity',
    'manifestURL': 'app://fakeact2.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact2.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 2'
    }
  };

  var fakeLaunchConfig1 = {
    type: 'launchapp',
    detail: {
      'isActivity': true,
      'url': 'app://fakeact.gaiamobile.org/pick.html',
      'oop': true,
      'name': 'Fake Activity',
      'manifestURL': 'app://fakeact.gaiamobile.org/manifest.webapp',
      'origin': 'app://fakeact.gaiamobile.org',
      'manifest': {
        'name': 'Fake Activity'
      },
      'inline': true
    }
  };

  var fakeLaunchConfig2 = {
    type: 'launchapp',
    detail: {
      'isActivity': true,
      'url': 'app://fakeact2.gaiamobile.org/pick.html',
      'oop': true,
      'name': 'Fake Activity 2',
      'manifestURL': 'app://fakeact2.gaiamobile.org/manifest.webapp',
      'origin': 'app://fakeact2.gaiamobile.org',
      'manifest': {
        'name': 'Fake Activity 2'
      },
      'inline': true
    }
  };

  var fakeLaunchConfig3 = {
    type: 'launchapp',
    detail: {
      'isActivity': true,
      'url': 'app://fakeact3.gaiamobile.org/pick.html',
      'oop': true,
      'name': 'Fake Activity 3',
      'manifestURL': 'app://fakeact3.gaiamobile.org/manifest.webapp',
      'origin': 'app://fakeact3.gaiamobile.org',
      'manifest': {
        'name': 'Fake Activity 3'
      },
      'inline': true
    }
  };

  setup(function(done) {
    switchProperty(window, 'OrientationManager', MockOrientationManager, reals);
    switchProperty(window, 'SettingsListener', MockSettingsListener, reals);
    switchProperty(window, 'WindowManager', MockWindowManager, reals);
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
    requireApp('system/js/activity_window.js');
    requireApp('system/js/activity_window_factory.js', done);
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

    restoreProperty(window, 'AttentionScreen', reals);
    restoreProperty(window, 'SettingsListener', reals);
    restoreProperty(window, 'SoftwareButtonManager', reals);
    restoreProperty(window, 'StatusBar', reals);
    restoreProperty(window, 'KeyboardManager', reals);
    restoreProperty(window, 'WindowManager', reals);
    restoreProperty(window, 'Applications', reals);
    restoreProperty(window, 'ManifestHelper', reals);
    restoreProperty(window, 'OrientationManager', reals);
  });

  suite('handle events', function() {
    setup(function() {
      MockWindowManager.mRunningApps = {
        'fake': new AppWindow({
                  origin: 'fake',
                  manifestURL: 'fake',
                  manifest: {},
                  frame: document.createElement('div'),
                  iframe: document.createElement('iframe')
                }),
        'fake2': new AppWindow({
                  origin: 'fake2',
                  manifestURL: 'fake2',
                  manifest: {},
                  frame: document.createElement('div'),
                  iframe: document.createElement('iframe')
                })
      };
      MockWindowManager.mDisplayedApp = 'fake';
    });
    teardown(function() {
    });
    test('activity request', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);

      assert.isTrue(ActivityWindowFactory._lastActivity != null);

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('back to home: one inline activity', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);
      var activity = ActivityWindowFactory._lastActivity;
      var stubKill = this.sinon.stub(activity, 'kill');

      ActivityWindowFactory.handleEvent({
        'type': 'home'
      });

      assert.isTrue(stubKill.called);
      stubKill.restore();

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('second activity request on the same caller', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);
      var activity1 = ActivityWindowFactory._lastActivity;
      activity1.close();
      var stubKill = this.sinon.stub(activity1, 'kill');
      var stubActive = this.sinon.stub(activity1, 'isActive');
      stubActive.returns(false);
      activity1.publish('activitywillclose');
      ActivityWindowFactory.handleEvent(fakeLaunchConfig2);

      assert.isTrue(stubKill.called);
      stubKill.restore();
      stubActive.restore();

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('maintain activity: created', function() {
      var current = ActivityWindowFactory._activities.length;
      ActivityWindowFactory.handleEvent({
        type: 'activitycreated',
        detail: {
          instanceID: 99999
        }
      });

      assert.isTrue(ActivityWindowFactory._activities.length === current + 1);
      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('maintain activity: terminated', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);

      var activity = ActivityWindowFactory._lastActivity;
      ActivityWindowFactory.handleEvent({
        type: 'activityterminated',
        detail: {
          instanceID: activity.instanceID
        }
      });

      assert.isTrue(ActivityWindowFactory._lastActivity == null);

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('show current activity', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);

      var activity = ActivityWindowFactory._lastActivity;
      var stubSetVisible = this.sinon.stub(activity, 'setVisible');
      ActivityWindowFactory.handleEvent({
        type: 'showwindow',
        stopImmediatePropagation: function() {}
      });

      assert.isTrue(stubSetVisible.calledWith(true));
      stubSetVisible.restore();

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('hide current activity', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);

      var activity = ActivityWindowFactory._lastActivity;
      var stubSetVisible = this.sinon.stub(activity, 'setVisible');
      ActivityWindowFactory.handleEvent({
        type: 'hidewindow',
        stopImmediatePropagation: function() {}
      });

      assert.isTrue(stubSetVisible.calledWith(false));
      stubSetVisible.restore();

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });

    test('update active activity', function() {
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);

      var activity = ActivityWindowFactory._lastActivity;

      assert.equal(ActivityWindowFactory._activeActivity, activity);

      ActivityWindowFactory.handleEvent({
        type: 'activitywillclose',
        detail: activity,
        stopImmediatePropagation: function() {}
      });

      assert.isTrue(ActivityWindowFactory._activeActivity == null);

      ActivityWindowFactory.handleEvent({
        type: 'activitywillopen',
        detail: activity,
        stopImmediatePropagation: function() {}
      });

      assert.equal(ActivityWindowFactory._activeActivity, activity);

      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activities = [];
    });
  });
});
