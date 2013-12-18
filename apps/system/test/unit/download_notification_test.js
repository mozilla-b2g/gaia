'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_download.js');
requireApp('system/test/unit/mock_download_store.js');
requireApp('system/test/unit/mock_download_ui.js');
requireApp('system/test/unit/mock_download_formatter.js');
requireApp('system/test/unit/mock_download_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/test/unit/mock_activity.js');

requireApp('system/js/download/download_notification.js');

var mocksForDownloadNotification = new MocksHelper([
  'Download',
  'NotificationScreen',
  'L10n',
  'LazyLoader',
  'MozActivity',
  'DownloadHelper',
  'DownloadFormatter',
  'DownloadUI',
  'DownloadStore'
]).init();

suite('system/DownloadNotification >', function() {

  var notification, realL10n, download;

  mocksForDownloadNotification.attachTestHelpers();

  suiteSetup(function() {
    // This suite checks the life cycle of a download notification
    download = new Download();
    download.resume = function() {};
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.sinon.stub(NotificationScreen, 'addNotification');
    this.sinon.stub(NotificationScreen, 'removeNotification');
    this.sinon.spy(DownloadStore, 'add');
  });

  function assertUpdatedNotification(download, state) {
    assert.isTrue(NotificationScreen.addNotification.called);

    var args = NotificationScreen.addNotification.args[0];
    var fileName = DownloadFormatter.getFileName(download);
    assert.isTrue(args[0].text.indexOf(fileName) !== -1);
    state = (typeof state !== 'undefined') ? state : download.state;
    assert.equal(args[0].type, 'download-notification-' + state);
  }

  test('Download notification has been created', function() {
    notification = new DownloadNotification(download);
    assert.isTrue(NotificationScreen.addNotification.called);
  });

  test('The download starts', function() {
    assert.isFalse(NotificationScreen.addNotification.called);
    download.state = 'downloading';
    download.onstatechange();
    assertUpdatedNotification(download);

    sinon.assert.calledWithMatch(NotificationScreen.addNotification, {
      noNotify: true
    });
  });

  test('The notification was clicked while downloading > Show download list',
       function() {
    notification.onClick();
    assert.equal(mockMozActivityInstance.name, 'configure');
    assert.equal(mockMozActivityInstance.data.target, 'device');
    assert.equal(mockMozActivityInstance.data.section, 'downloads');
  });

  test('The download was stopped', function() {
    assert.isFalse(NotificationScreen.removeNotification.called);
    download.state = 'stopped';
    download.onstatechange();
    assert.isTrue(NotificationScreen.removeNotification.called);
  });

  test('Download continues downloading', function() {
    assert.isFalse(NotificationScreen.addNotification.called);
    download.state = 'downloading';
    download.onstatechange();
    assertUpdatedNotification(download, 'started');

    sinon.assert.neverCalledWithMatch(NotificationScreen.addNotification, {
      noNotify: true
    });
  });

  test('Download was stopped', function() {
    assert.isFalse(NotificationScreen.removeNotification.called);
    download.state = 'stopped';
    download.onstatechange();
    assert.isTrue(NotificationScreen.removeNotification.called);
  });

  test('Download continues downloading', function() {
    assert.isFalse(NotificationScreen.addNotification.called);
    download.state = 'downloading';
    download.currentBytes = 300;
    download.onstatechange();
    assertUpdatedNotification(download, 'started');

    sinon.assert.neverCalledWithMatch(NotificationScreen.addNotification, {
      noNotify: true
    });
  });

  test('Download finishes', function() {
    assert.isFalse(NotificationScreen.addNotification.called);
    download.state = 'succeeded';
    download.onstatechange();
    assertUpdatedNotification(download);
    assert.ok(DownloadStore.add.calledOnce);
  });

  test('Finished notification was clicked > Open file', function() {
    notification.onClick(function() {});
    assert.equal(DownloadHelper.methodCalled, 'launch');

    assert.isNull(notification.id);
    assert.isNull(notification.download);
    assert.isNull(notification.state);
  });

});
