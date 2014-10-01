'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_navigator_moz_download_manager.js');
requireApp('system/test/unit/mock_download_notification.js');
requireApp('system/test/unit/mock_download_formatter.js');
requireApp('system/test/unit/mock_notification_screen.js');

requireApp('system/js/download/download_manager.js');

var mocksForDownloadManager = new MocksHelper([
  'DownloadNotification',
  'DownloadFormatter',
  'NotificationScreen',
  'LazyLoader'
]).init();

suite('system/DownloadManager >', function() {

  var id = 'this-is-a-fake-uuid';

  mocksForDownloadManager.attachTestHelpers();

  test('Notification has been created successfully', function() {
    navigator.mozDownloadManager.ondownloadstart({
      download: {
        id: id
      }
    });

    assert.equal(MockDownloadNotification.methodCalled, 'DownloadNotification');
  });

  test('Notification has been clicked', function() {
    var event = new CustomEvent('notification-clicked', {
      detail: {
        id: id
      }
    });

    window.dispatchEvent(event);

    assert.equal(MockDownloadNotification.methodCalled, 'onClick');
  });
});
