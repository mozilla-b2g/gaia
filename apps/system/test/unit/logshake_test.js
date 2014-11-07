'use strict';
/* global LogShake,
          MockDOMRequest,
          MockModalDialog,
          MockNavigatorGetDeviceStorage,
          MockNotification,
          MockL10n
*/

requireApp('system/js/devtools/logshake.js');

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_notification.js');
requireApp('system/shared/test/unit/mocks/mock_event_target.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
requireApp('system/test/unit/mock_navigator_get_device_storage.js');
requireApp('system/test/unit/mock_modal_dialog.js');

/**
 * Test shake-to-log functionality.
 * Borrows heavily from screenshot_test.js
 */
suite('system/LogShake', function() {
  var realL10n;
  var realDOMRequest;
  var realModalDialog;
  var realNavigatorGetDeviceStorage;
  var realNotification;

  var logshake;
  var logTag = 'logshake';

  setup(function() {
    // XXX: Use screenshot's hack until system2 rolls around
    if (window.logshake) {
      window.logshake.stop();
      window.logshake = null;
    }

    realDOMRequest = window.DOMRequest;
    window.DOMRequest = MockDOMRequest;

    realModalDialog = window.ModalDialog;
    window.ModalDialog = MockModalDialog;

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
    window.DOMRequest = realDOMRequest;
    window.ModalDialog = realModalDialog;
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
    navigator.mozL10n = realL10n;
    window.Notification = realNotification;

    // XXX: Do not restore window's logshake, its time is over
  });

  suite('Capture success handling', function() {
    var filename = 'logs/2014-06-03-00-00/log.log';
    var logPrefix = 'logs/2014-06-03-00-00/';
    var notificationSpy;

    setup(function() {
      notificationSpy = this.sinon.spy(window, 'Notification');

      window.dispatchEvent(new CustomEvent('capture-logs-success',
        { detail: { logFilenames: [filename], logPrefix: logPrefix } }));
    });

    test('Notification sent', function() {
      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'logsSaved');
      assert.equal(notificationSpy.firstCall.args[1].body,
        logPrefix);
      assert.equal(notificationSpy.firstCall.args[1].tag,
        logTag);
    });

    test('Clicking notification', function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var storageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var getSpy = this.sinon.spy(mockDeviceStorage, 'get');

      var notification = notificationSpy.firstCall.thisValue;
      notification.onclick();

      assert.isTrue(storageSpy.calledOnce, 'getDeviceStorage should be called');
      assert.isTrue(getSpy.calledOnce, '.get() should be called');
      assert.equal(getSpy.firstCall.args[0], filename,
        '.get() should have been called with filename from event');
    });
  });

  suite('Capture error handling', function() {
    var notificationSpy, errorMessage,
        errorUnixSharedSD, errorUnixGeneric,
        errorUnixExpectedBody;

    function sendError(e) {
      window.dispatchEvent(new CustomEvent('capture-logs-error',
        { detail: { error: e } }));
    }

    function notificationAsserts(spy) {
      assert.isTrue(spy.calledOnce, 'Notification should be called');
      assert.isTrue(spy.calledWithNew(), 'Notification created with new');
      assert.equal(spy.firstCall.args[0], 'logsSaveError');
      assert.equal(spy.firstCall.args[1].tag, logTag);
    }

    function assertBody(expected) {
      assert.equal(notificationSpy.firstCall.args[1].body, expected);
    }

    setup(function() {
      notificationSpy = this.sinon.spy(window, 'Notification');
      errorMessage = 'error error error';
      errorUnixSharedSD = {
        operation: 'makeDir',
        unixErrno: 30 // EROFS
      };
      errorUnixGeneric = {
        operation: 'makeDir',
        unixErrno: 0
      };
      errorUnixExpectedBody = 'logsOperationFailed{"operation":"makeDir"}';
    });

    test('Handling capture-logs-error event with string error', function() {
      sendError(errorMessage);
      notificationAsserts(notificationSpy);
      assertBody(errorMessage);
    });

    suite('Handling capture-logs-error event with errno', function() {
      test('Handling known errno', function() {
        sendError(errorUnixSharedSD);
        notificationAsserts(notificationSpy);
        assertBody(errorUnixExpectedBody);
      });

      test('Handling unknown errno', function() {
        sendError(errorUnixGeneric);
        notificationAsserts(notificationSpy);
        assertBody(errorUnixExpectedBody);
      });
    });

    suite('Clicking error notification', function() {
      var notification;
      function triggerClick() {
        notification = notificationSpy.firstCall.thisValue;
        notification.onclick();
      }

      var modalSpy;
      setup(function() {
        modalSpy = this.sinon.spy(MockModalDialog, 'alert');
      });

      test('Known errno', function() {
        sendError(errorUnixSharedSD);
        triggerClick();
        assert.isTrue(modalSpy.calledWith('logsSaveError',
                                          'logsSDCardMaybeShared',
                                          { title: 'ok' }));
      });

      test('Unknown errno', function() {
        sendError(errorUnixGeneric);
        triggerClick();
        assert.isTrue(modalSpy.calledWith('logsSaveError',
                                          'logsGenericError',
                                          { title: 'ok' }));
      });
    });
  });

  test('Create notification after capture-logs-start event', function() {
    var notificationSpy = this.sinon.spy(window, 'Notification');

    window.dispatchEvent(new CustomEvent('capture-logs-start', { detail: {} }));

    // LogShake should dispatch a notification of some kind
    assert.isTrue(notificationSpy.calledOnce, 'Notification should be called');
    assert.isTrue(notificationSpy.calledWithNew(),
      'Notification should be called with new');
    assert.equal(notificationSpy.firstCall.args[0],
      'logsSaving');
    assert.equal(notificationSpy.firstCall.args[1].tag,
      logTag);
  });
});
