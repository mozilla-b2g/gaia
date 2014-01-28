'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'AppWindowManager', 'Applications', 'ManifestHelper',
      'ActivityWindow', 'KeyboardManager', 'StatusBar',
      'SoftwareButtonManager', 'AttentionScreen', 'AppWindow',
      'ActivityWindowFactory', 'OrientationManager',
      'BrowserConfigHelper', 'System']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_activity_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');

var mocksForActivityWindowFactory = new MocksHelper([
  'OrientationManager', 'AttentionScreen',
  'Applications', 'SettingsListener', 'HomescreenLauncher',
  'ManifestHelper', 'KeyboardManager', 'SoftwareButtonManager',
  'HomescreenWindow', 'ActivityWindow', 'AppWindow', 'AppWindowManager'
]).init();

suite('system/ActivityWindowFactory', function() {
  mocksForActivityWindowFactory.attachTestHelpers();
  var activityWindow;
  var stubById;
  var fakeActivityConfig1 = {
    'url': 'app://fakeact1.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity 1',
    'manifestURL': 'app://fakeact1.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 1'
    }
  };

  var fakeActivityConfig2 = {
    'url': 'app://fakeact2.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity 2',
    'manifestURL': 'app://fakeact2.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact2.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 2'
    }
  };

  var fakeActivityConfig3 = {
    'url': 'app://fakeact3.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity 3',
    'manifestURL': 'app://fakeact3.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact3.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity 3'
    }
  };

  var activity1, activity2, activity3;
  var app1, app2;

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeAppConfig2 = {
    url: 'app://www.fake2/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake2/ManifestURL',
    origin: 'app://www.fake2'
  };

  var fakeLaunchConfig1 = {
    type: 'launchactivity',
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
    type: 'launchactivity',
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
    type: 'launchactivity',
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

  var fakeOpenConfig = {
    type: 'activityopening',
    detail: {
      'isActivity': true,
      'url': 'app://fakeact4.gaiamobile.org/pick.html',
      'oop': true,
      'name': 'Fake Activity 4',
      'manifestURL': 'app://fakeact4.gaiamobile.org/manifest.webapp',
      'origin': 'app://fakeact4.gaiamobile.org',
      'manifest': {
        'name': 'Fake Activity 4'
      },
      'inline': true
    }
  };

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    requireApp('system/js/system.js');
    requireApp('system/js/activity_window_factory.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('handle events', function() {
    setup(function() {
      activity1 = new ActivityWindow(fakeActivityConfig1);
      activity2 = new ActivityWindow(fakeActivityConfig2);
      activity3 = new ActivityWindow(fakeActivityConfig3);
      app1 = new AppWindow(fakeAppConfig1);
      app2 = new AppWindow(fakeAppConfig2);
      MockAppWindowManager.mRunningApps = {
        'fake': new AppWindow({
                  origin: 'fake',
                  manifestURL: 'fake',
                  manifest: {},
                  frame: document.createElement('div'),
                  iframe: document.createElement('iframe'),
                  url: 'http://fake/index.html'
                }),
        'fake2': new AppWindow({
                  origin: 'fake2',
                  manifestURL: 'fake2',
                  manifest: {},
                  frame: document.createElement('div'),
                  iframe: document.createElement('iframe'),
                  url: 'http://fake/index.html'
                })
      };
      MockAppWindowManager.mDisplayedApp = 'fake';
    });
    teardown(function() {
    });
    test('activity request', function() {
      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activeActivity = null;
      ActivityWindowFactory._activities = [];
      ActivityWindowFactory.handleEvent(fakeLaunchConfig1);

      assert.isTrue(ActivityWindowFactory._lastActivity != null);
    });

    test('activity will open', function() {
      ActivityWindowFactory._lastActivity = null;
      ActivityWindowFactory._activeActivity = null;
      ActivityWindowFactory._activities = [];
      ActivityWindowFactory.handleEvent(fakeOpenConfig);

      assert.isTrue(ActivityWindowFactory._activeActivity != null);
    });

    test('back to home: one inline activity', function() {
      ActivityWindowFactory._activities = [activity1, activity2, activity3];
      ActivityWindowFactory._lastActivity = activity1;
      var stubKill = this.sinon.stub(activity1, 'kill');

      ActivityWindowFactory.handleEvent({
        'type': 'home'
      });

      assert.isTrue(stubKill.called);
      stubKill.restore();
    });

    test('second activity request on the same caller which is an activity',
      function() {
        ActivityWindowFactory._activities = [activity1, activity2, activity3];
        ActivityWindowFactory._lastActivity = activity1;
        ActivityWindowFactory._activeActivity = activity1;
        var stubActive = this.sinon.stub(activity1, 'isActive');
        stubActive.returns(true);
        activity1.activityCallee = activity3;
        var stubKill = this.sinon.stub(activity3, 'kill');
        ActivityWindowFactory.handleEvent(fakeLaunchConfig2);

        assert.isTrue(stubKill.called);
        delete activity1.activityCallee;
      });

    test('second activity request is the same as first activity',
      function() {
        ActivityWindowFactory._activities = [activity1];
        ActivityWindowFactory._lastActivity = activity1;
        ActivityWindowFactory._activeActivity = activity1;
        var stubActive = this.sinon.stub(activity1, 'isActive');
        stubActive.returns(true);
        ActivityWindowFactory.handleEvent(fakeLaunchConfig1);
        assert.equal(ActivityWindowFactory._activities.length, 1);
      });

    test('maintain activity: created', function() {
      ActivityWindowFactory._activities = [activity1, activity2, activity3];
      ActivityWindowFactory._lastActivity = activity1;
      var current = ActivityWindowFactory._activities.length;
      ActivityWindowFactory.handleEvent({
        type: 'activitycreated',
        detail: {
          instanceID: 99999
        }
      });

      assert.isTrue(ActivityWindowFactory._activities.length === current + 1);
    });

    test('maintain activity: terminated', function() {
      ActivityWindowFactory._activities = [activity1, activity2, activity3];
      ActivityWindowFactory._lastActivity = activity1;
      ActivityWindowFactory._activeActivity = activity1;

      ActivityWindowFactory.handleEvent({
        type: 'activityterminated',
        detail: activity1
      });

      assert.isTrue(ActivityWindowFactory._lastActivity == null);
    });

    test('show current activity', function() {
      ActivityWindowFactory._activities = [activity1, activity2, activity3];
      ActivityWindowFactory._lastActivity = activity1;
      ActivityWindowFactory._activeActivity = activity1;
      var stubSetVisible = this.sinon.stub(activity1, 'setVisible');
      ActivityWindowFactory.handleEvent({
        type: 'showwindow',
        stopImmediatePropagation: function() {}
      });

      assert.isTrue(stubSetVisible.calledWith(true));
    });

    test('hide current activity', function() {
      ActivityWindowFactory._activities = [activity1, activity2, activity3];
      ActivityWindowFactory._lastActivity = activity1;
      ActivityWindowFactory._activeActivity = activity1;
      var stubSetVisible = this.sinon.stub(activity1, 'setVisible');
      ActivityWindowFactory.handleEvent({
        type: 'hidewindow',
        stopImmediatePropagation: function() {}
      });

      assert.isTrue(stubSetVisible.calledWith(false));
    });

    test('update active activity', function() {
      ActivityWindowFactory._activities = [activity1, activity2, activity3];
      ActivityWindowFactory._activeActivity = activity1;
      ActivityWindowFactory.handleEvent({
        type: 'activityclosing',
        detail: activity1,
        stopImmediatePropagation: function() {}
      });

      assert.isTrue(ActivityWindowFactory._activeActivity == null);

      ActivityWindowFactory.handleEvent({
        type: 'activityopening',
        detail: activity1,
        stopImmediatePropagation: function() {}
      });

      assert.deepEqual(ActivityWindowFactory._activeActivity, activity1);
    });

  });
});
