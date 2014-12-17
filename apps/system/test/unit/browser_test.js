/*global MocksHelper, MockNavigatormozSetMessageHandler,
         MockApplications, MockAppWindow, MockAppWindowHelper */

'use strict';

require('/js/browser_config_helper.js');
require('/shared/js/url_helper.js');

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_applications.js');

var mocksForBrowser = new MocksHelper([
  'AppWindow', 'Applications'
]).init();

suite('system/Browser', function() {
  mocksForBrowser.attachTestHelpers();

  var realMozSetMessageHandler;
  suiteSetup(function(done) {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();
    window.applications = MockApplications;

    require('/js/browser.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mTeardown();
  });

  setup(function() {
    this.sinon.spy(MockAppWindow.prototype, 'requestOpen');
  });

  test('should open a new app window with the correct config', function() {
    MockNavigatormozSetMessageHandler.mTrigger('activity', {
      source: {
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
});
