/*global MocksHelper, MockNavigatormozSetMessageHandler, Browser,
         MockApplications, MockAppWindow, MockAppWindowHelper,
         ActivityHandler, MockNavigatorSettings, setImmediate */

'use strict';

require('/js/browser_config_helper.js');
require('/shared/js/url_helper.js');
require('/shared/js/settings_listener.js');
require('/js/import.js');
require('/js/activity_handler.js');
require('/js/browser.js');

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/test/unit/mock_lazy_loader.js');
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_applications.js');

var mocksForBrowser = new MocksHelper([
  'AppWindow', 'Applications', 'LazyLoader'
]).init();

suite('system/Browser', function() {
  mocksForBrowser.attachTestHelpers();

  var realMozSettings;
  var realMozSetMessageHandler;
  var subject;
  var clock;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();
    window.applications = MockApplications;
    var handler = new ActivityHandler();
    handler.start();
    subject = new Browser();
    subject.start();
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    MockNavigatorSettings.mSetup();
    MockNavigatorSettings.mSyncRepliesOnly = true;
    this.sinon.spy(MockAppWindow.prototype, 'requestOpen');
    clock = this.sinon.useFakeTimers();
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    clock.restore();
  });

  test('should open a new app window with the correct config', function() {
    MockNavigatormozSetMessageHandler.mTrigger('activity', {
      source: {
        name: 'view',
        data: {
          name: 'view',
          type: 'url',
          url: 'http://arandomurl.com'
        }
      }
    });

    assert.equal(MockAppWindowHelper.mInstances.length, 1);
    var app = MockAppWindowHelper.mLatest;
    assert.equal(app.oop, true);
    assert.equal(app.url, 'http://arandomurl.com/');
    assert.equal(app.origin, 'http://arandomurl.com/');
  });

  test('when private browsing is requested', function() {
    MockNavigatormozSetMessageHandler.mTrigger('activity', {
      source: {
        name: 'view',
        data: {
          name: 'view',
          type: 'url',
          url: 'http://arandomurl.com',
          isPrivate: true
        }
      }
    });

    assert.equal(MockAppWindowHelper.mInstances.length, 1);
    var app = MockAppWindowHelper.mLatest;
    assert.equal(app.isPrivate, true);
  });

  test('when private browsing is the default setting', function() {
    MockNavigatorSettings.mTriggerObservers('browser.private.default',
        {settingValue: true});

    setImmediate(function () {
      MockNavigatormozSetMessageHandler.mTrigger('activity', {
        source: {
          name: 'view',
          data: {
            name: 'view',
            type: 'url',
            url: 'http://arandomurl.com'
          }
        }
      });

      assert.equal(MockAppWindowHelper.mInstances.length, 1);
      var app = MockAppWindowHelper.mLatest;
      assert.equal(app.isPrivate, true);
    });
  });
});
