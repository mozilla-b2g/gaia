'use strict';
/* global MockNavigatorGetDeviceStorage, LogShake, MockNotification, MockL10n */

requireApp('system/js/devtools/logshake.js');

require('/test/unit/mock_navigator_get_device_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_notification.js');

/**
 * Test shake-to-log functionality.
 * Borrows heavily from screenshot_test.js
 */
suite('system/LogShake', function() {
  var realL10n;
  var realNavigatorGetDeviceStorage;
  var realNotification;

  var logshake;

  setup(function() {
    // XXX: Use screenshot's hack until system2 rolls around
    if (window.logshake) {
      window.logshake.stop();
      window.logshake = null;
    }

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realNotification = window.Notification;
    window.Notification = MockNotification;

    logshake = new LogShake();
    logshake.start();
  });

  teardown(function() {
    logshake.stop();
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
    navigator.mozL10n = realL10n;
    window.Notification = realNotification;

    // XXX: Do not restore window's logshake, its time is over
  });

  test('Create notification after capture-logs-success event', function() {
    var notificationSpy = this.sinon.spy(window, 'Notification');
    var filename = 'logs/2014-06-03-00-00/log.log';
    var logPrefix = 'logs/2014-06-03-00-00/';

    window.dispatchEvent(new CustomEvent('capture-logs-success',
      { detail: { logFilenames: [filename], logPrefix: logPrefix } }));

    // LogShake should dispatch a notification of some kind
    assert.isTrue(notificationSpy.calledOnce);
    assert.isTrue(notificationSpy.calledWithNew());
    assert.equal(notificationSpy.firstCall.args[0],
      'logsSaved');
    assert.equal(notificationSpy.firstCall.args[1].body,
      logPrefix);
    /* XXX: Cannot test without firing click event on notification
    var mockDeviceStorage = MockNavigatorGetDeviceStorage();
    var deviceStorageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
    var getSpy = this.sinon.spy(mockDeviceStorage, 'get');
    assert.isTrue(deviceStorageSpy.calledOnce,
      'Clicking notification should cause getDeviceStorage to be called');
    assert.isTrue(getSpy.calledOnce,
      'Clicking notification should cause get to be called');
    assert.equal(getSpy.firstCall.args[0], filename,
      'get should have been called with filename from event');
      */
  });

  test('Create notification after capture-logs-error event', function() {
    var notificationSpy = this.sinon.spy(window, 'Notification');
    var errorMessage = 'error error error';

    window.dispatchEvent(new CustomEvent('capture-logs-error',
      { detail: { error: errorMessage } }));

    // LogShake should dispatch a notification of some kind
    assert.isTrue(notificationSpy.calledOnce, 'Notification should be called');
    assert.isTrue(notificationSpy.calledWithNew(),
      'Notification should be called with new');
    assert.equal(notificationSpy.firstCall.args[0],
      'logsFailed');
    assert.equal(notificationSpy.firstCall.args[1].body,
      errorMessage);
  });
});
