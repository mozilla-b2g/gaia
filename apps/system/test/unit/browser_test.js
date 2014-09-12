/*global MockNavigatormozSetMessageHandler */

'use strict';

require('/js/browser_config_helper.js');
require('/shared/js/url_helper.js');

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

suite('system/Browser', function() {
  var realMozSetMessageHandler;
  suiteSetup(function(done) {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    require('/js/browser.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mTeardown();
  });

  test('should open a new app window with the correct config', function(done) {
    window.addEventListener('openwindow', function onOpenWindow(evt) {
      window.removeEventListener('openwindow', onOpenWindow);

      var app = evt.detail;
      assert.equal(app.useAsyncPanZoom, true);
      assert.equal(app.oop, true);
      assert.equal(app.url, 'http://arandomurl.com/');
      assert.equal(app.origin, 'http://arandomurl.com/');
      done();
    });

    MockNavigatormozSetMessageHandler.mTrigger('activity', {
      source: {
        data: {
          name: 'view',
          type: 'url',
          url: 'http://arandomurl.com'
        }
      }
    });
  });
});
