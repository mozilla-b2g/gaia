'use strict';

mocha.globals(['AppWindow', 'BrowserMixin', 'ActivityWindow',
  'System', 'BrowserFrame', 'BrowserConfigHelper', 'OrientationManager',
  'SettingsListener', 'Applications']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_attention_screen.js');

requireApp('system/shared/test/unit/mocks/mock_screen_layout.js');

var mocksForActivityWindow = new MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'AttentionScreen'
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
    var app, appF, appOrientationUndefined;
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
      appOrientationUndefined = new AppWindow({
        iframe: document.createElement('iframe'),
        frame: document.createElement('div'),
        origin: 'http://fake',
        url: 'http://fakeurl/index.html',
        manifestURL: 'http://fakemanifesturl',
        name: 'fake',
        manifest: {
        }
      });
    });
    teardown(function() {
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
      activity.rearWindow = app;
      app.frontWindow = activity;
      var stubRequestOpen = this.sinon.stub(app, 'requestOpen');

      activity.requestOpen();

      assert.isTrue(stubRequestOpen.calledOnce);
    });

    test('copy fullscreen from caller', function() {
      var activity = new ActivityWindow(fakeConfig, appF);
      assert.isTrue(activity.element.classList.contains('fullscreen-app'));
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
      activity.setOrientation();
      assert.isTrue(stubSetOrientation2.called);
    });

    test('Activity set orientation use config', function() {
      var activity = new ActivityWindow(fakeConfigWithOrientation,
                                        appOrientationUndefined);
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

    test('Activity set orientation use callee', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var stubIsActive = this.sinon.stub(activity, 'isActive');
      stubIsActive.returns(true);
      var stubLockOrientation;
      if ('lockOrientation' in screen) {
        stubLockOrientation = this.sinon.stub(screen, 'lockOrientation');
      } else if ('mozLockOrientation' in screen) {
        stubLockOrientation = this.sinon.stub(screen, 'mozLockOrientation');
      }
      activity.setOrientation();
      assert.isTrue(stubLockOrientation.calledWith('default'));
    });

    test('Activity setOrientation use global orientation', function() {
      var activity = new ActivityWindow(fakeConfig, appOrientationUndefined);
      var stubIsActive = this.sinon.stub(activity, 'isActive');
      stubIsActive.returns(true);
      var stubLockOrientation;
      if ('lockOrientation' in screen) {
        stubLockOrientation = this.sinon.stub(screen, 'lockOrientation');
      } else if ('mozLockOrientation' in screen) {
        stubLockOrientation = this.sinon.stub(screen, 'mozLockOrientation');
      }
      activity.setOrientation();
      assert.isTrue(stubLockOrientation.calledWith('portrait-primary'));
    });
  });
});
