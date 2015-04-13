/* global MocksHelper, MockDownloadNotification */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/test/unit/mock_navigator_moz_download_manager.js');
requireApp('system/test/unit/mock_download_notification.js');
requireApp('system/test/unit/mock_download_formatter.js');
requireApp('system/test/unit/mock_notification_screen.js');


requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/download_icon.js');

requireApp('system/js/download/download_manager.js');

var mocksForDownloadManager = new MocksHelper([
  'DownloadNotification',
  'DownloadFormatter',
  'NotificationScreen',
  'LazyLoader'
]).init();

suite('system/DownloadManager >', function() {

  var mockDownload = {
    id: 'this-is-a-fake-uuid',
    pause: sinon.spy()
  };

  mocksForDownloadManager.attachTestHelpers();

  setup(function() {
    this.sinon.spy(window, 'DownloadIcon');
    navigator.mozDownloadManager.ondownloadstart({
      download: mockDownload
    });
  });

  test('Notification has been created successfully', function() {
    assert.equal(MockDownloadNotification.methodCalled, 'DownloadNotification');
  });

  test('Notification has been clicked', function() {
    var event = new CustomEvent('notification-clicked', {
      detail: {
        id: mockDownload.id
      }
    });

    window.dispatchEvent(event);

    assert.equal(MockDownloadNotification.methodCalled, 'onClick');
  });

  test('Pause when shutdown', function() {
    var event = new CustomEvent('will-shutdown');
    window.dispatchEvent(event);
    assert.isTrue(mockDownload.pause.called);
  });
});
