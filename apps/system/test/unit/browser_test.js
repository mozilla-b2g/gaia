'use strict';
/* global UrlHelper, MockNavigatormozSetMessageHandler */

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/url_helper.js');

suite('system/browser', function() {
  var realMozSetMessageHandler;

  setup(function(done) {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();
    requireApp('system/js/browser.js', done);
  });

  teardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
  });

  test('on url activity received', function(done) {
    window.addEventListener('openwindow', function onOpenWindow(evt) {
      window.removeEventListener('openwindow', onOpenWindow);
      assert.deepEqual(evt.detail, {
        oop: true,
        useAsyncPanZoom: true,
        url: UrlHelper.getUrlFromInput('test')
      });
      done();
    });

    MockNavigatormozSetMessageHandler.mTrigger('activity', {
      source: {
        data: {
          type: 'url',
          url: 'test'
        }
      }
    });
  });
});
