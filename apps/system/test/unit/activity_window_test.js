'use strict';

mocha.globals(['AppWindow', 'BrowserMixin', 'ActivityWindow',
  'System', 'BrowserFrame', 'BrowserConfigHelper', 'LayoutManager',
  'OrientationManager', 'SettingsListener', 'Applications']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');

requireApp('system/shared/test/unit/mocks/mock_screen_layout.js');

var mocksForActivityWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager', 'AttentionScreen'
]).init();

suite('system/ActivityWindow', function() {
  mocksForActivityWindow.attachTestHelpers();
  var activityWindow;
  var stubById;
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
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/activity_window.js', done);
  });

  teardown(function() {
    stubById.restore();
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

    test('handleEvent: closing activity', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var stubRestoreCaller = this.sinon.stub(activity, 'restoreCaller');
      activity.handleEvent({
        type: '_closing'
      });
      assert.isTrue(stubRestoreCaller.called);
    });

    test('handleEvent: activity opened', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var stubIsOOP = this.sinon.stub(app, 'isOOP');
      var stubSetVisible = this.sinon.stub(app, 'setVisible');
      stubIsOOP.returns(false);
      activity.handleEvent({
        type: '_opened'
      });
      assert.isTrue(stubSetVisible.calledWith(false, true));
    });

    test('requestOpen', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var fakeAppConfig = {
        url: 'app://www.fake/index.html',
        manifest: {},
        manifestURL: 'app://wwww.fake/ManifestURL',
        origin: 'app://www.fake'
      };
      var app = new AppWindow(fakeAppConfig);
      activity.activityCaller = app;
      app.activityCallee = activity;
      var stubRequestOpen = this.sinon.stub(app, 'requestOpen');

      activity.requestOpen();

      assert.isTrue(stubRequestOpen.calledOnce);
    });

    test('copy fullscreen from caller', function() {
      var activity = new ActivityWindow(fakeConfig, appF);
      assert.isTrue(activity.element.classList.contains('fullscreen-app'));
    });

    test('restore caller', function() {
      var activity1 = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity1);

      var stubIsActiveForApp = this.sinon.stub(app, 'isActive');
      var stubIsActiveForAct1 = this.sinon.stub(activity1, 'isActive');

      var stubSetOrientationForApp =
        this.sinon.stub(app, 'setOrientation');
      var stubSetOrientationForAct1 =
        this.sinon.stub(activity1, 'setOrientation');
      app._killed = false;
      activity1._killed = false;
      stubIsActiveForApp.returns(true);
      stubIsActiveForAct1.returns(true);
      activity2.restoreCaller();
      assert.isTrue(stubSetOrientationForAct1.calledWith(true));
      activity1.restoreCaller();
      assert.isTrue(stubSetOrientationForApp.calledWith(true));
    });

    test('restore caller when AttentionScreen is there', function() {
      MockAttentionScreen.mFullyVisible = true;
      var activity1 = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity1);

      var stubSetVisibleForApp = this.sinon.stub(app, 'setVisible');
      var stubSetVisible1 = this.sinon.stub(activity1, 'setVisible');
      activity2.restoreCaller();
      assert.isFalse(stubSetVisible1.called);
      activity1.restoreCaller();
      assert.isFalse(stubSetVisibleForApp.called);
      MockAttentionScreen.mFullyVisible = false;
    });

    test('killed when activity is active', function() {
      var activity1 = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity1);
      var stubIsActive = this.sinon.stub(activity1, 'isActive');
      var stubKill2 = this.sinon.stub(activity2, 'kill');
      var stubPublish = this.sinon.stub(activity1, 'publish');
      stubIsActive.returns(true);
      activity1.element = document.createElement('div');
      document.body.appendChild(activity1.element);
      activity1.kill();
      assert.isFalse(stubKill2.called);
      activity1.element.dispatchEvent(new CustomEvent('_closed'));
      assert.isTrue(stubKill2.called);
      assert.isTrue(stubPublish.calledWith('terminated'));
    });

    test('killed when activity is inactive', function() {
      var activity1 = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity1);
      var stubIsActive = this.sinon.stub(activity1, 'isActive');
      var stubKill2 = this.sinon.stub(activity2, 'kill');
      var stubPublish = this.sinon.stub(activity1, 'publish');

      stubIsActive.returns(false);
      activity1.element = document.createElement('div');
      document.body.appendChild(activity1.element);
      activity1.kill();
      assert.isTrue(stubKill2.called);
      assert.isTrue(stubPublish.calledWith('terminated'));
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

    test('Activity orientate chain', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var activity2 = new ActivityWindow(fakeConfig, activity);
      var stubSetOrientation2 = this.sinon.stub(activity2, 'setOrientation');
      app.setOrientation();
      assert.isTrue(stubSetOrientation2.called);
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
  });
});
