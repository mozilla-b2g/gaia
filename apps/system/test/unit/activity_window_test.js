/* global AppWindow, ActivityWindow, MocksHelper, BaseModule, MockContextMenu */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

requireApp('system/shared/test/unit/mocks/mock_screen_layout.js');

var mocksForActivityWindow = new MocksHelper([
  'Applications', 'SettingsListener',
  'ManifestHelper', 'Service'
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
  var fakeConfigFullScreen = {
    'url': 'app://fakeact.gaiamobile.org/pick.html',
    'oop': true,
    'name': 'Fake Activity',
    'manifestURL': 'app://fakeact.gaiamobile.org/manifest.webapp',
    'origin': 'app://fakeact.gaiamobile.org',
    'manifest': {
      'name': 'Fake Activity',
      'fullscreen': true
    }
  };

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      var element = document.createElement('div');
      if (id.indexOf('AppWindow') >= 0 || id.indexOf('ActivityWindow') >= 0) {
        var container = document.createElement('div');
        container.className = 'browser-container';
        element.appendChild(container);
      }

      return element;
    });
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/base_module.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/activity_window.js', function() {
      this.sinon.stub(BaseModule, 'instantiate', function(name) {
        if (name === 'BrowserContextMenu') {
          return MockContextMenu;
        }
      });
      done();
    }.bind(this));
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

    test('Render activity inside its caller', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      assert.deepEqual(activity.containerElement, app.element);
    });

    test('requestOpen', function() {
      var activity = new ActivityWindow(fakeConfig, app);
      var stubRequestOpen = this.sinon.stub(app, 'requestOpen');

      activity.requestOpen();

      assert.isTrue(stubRequestOpen.calledOnce);
    });

    test('copy fullscreen from caller', function() {
      var activity = new ActivityWindow(fakeConfig, appF);
      assert.isTrue(activity.element.classList.contains('fullscreen-app'));
    });

    test('prioritize fullscreen mode of the activity', function() {
      var activity = new ActivityWindow(fakeConfigFullScreen, app);
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

    test('Activity should stop event propagation', function() {
      var activity = new ActivityWindow(fakeConfig, appOrientationUndefined);
      var spy = this.sinon.spy();
      activity.handleEvent({
        type: 'mozbrowserloadend',
        stopPropagation: spy,
        detail: {}
      });
      assert.isTrue(spy.called);
    });
  });
});
