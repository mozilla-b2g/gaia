'use strict';

/* global LogShake,
          DOMError,
          MockDOMRequest,
          MockModalDialog,
          MockMozActivity,
          MockNavigatorGetDeviceStorage,
          MockGetDeviceStorages,
          MockNotification,
          MockNotificationHelper,
          MockL10n,
          MockService,
          MocksHelper
*/

require('/js/devtools/logshake.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorages.js');
require('/test/unit/mock_activity.js');
require('/test/unit/mock_modal_dialog.js');
require('/test/unit/mock_navigator_get_device_storage.js');

var mocksForLogshake = new MocksHelper([
  'Service'
]).init();

/**
 * Test shake-to-log functionality.
 * Borrows heavily from screenshot_test.js
 */
suite('system/LogShake', function() {
  var realL10n;
  var realDOMRequest;
  var realModalDialog;
  var realNavigatorGetDeviceStorage;
  var realNavigatorGetDeviceStorages;
  var realNotification;
  var realNotificationHelper;
  var realMozActivity;

  var logshake;
  var logTagBase = 'logshake:';
  var expectedLogTag = logTagBase + '1';

  mocksForLogshake.attachTestHelpers();

  setup(function() {
    // XXX: Use screenshot's hack until system2 rolls around
    if (window.logshake) {
      window.logshake.stop();
      window.logshake = null;
    }
    
    realNotificationHelper = window.NotificationHelper;
    window.NotificationHelper = MockNotificationHelper;

    realDOMRequest = window.DOMRequest;
    window.DOMRequest = MockDOMRequest;

    realModalDialog = window.ModalDialog;
    window.ModalDialog = MockModalDialog;

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

    realNavigatorGetDeviceStorages = navigator.getDeviceStorages;
    navigator.getDeviceStorages = MockGetDeviceStorages;

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realNotification = window.Notification;
    window.Notification = MockNotification;

    logshake = new LogShake();
    logshake.start();
    logshake._shakeId = 1;
  });

  teardown(function() {
    logshake._shakeId = null;
    logshake.stop();

    window.DOMRequest = realDOMRequest;
    window.ModalDialog = realModalDialog;
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
    navigator.getDeviceStorages = realNavigatorGetDeviceStorages;
    navigator.mozL10n = realL10n;
    window.NotificationHelper = realNotificationHelper;
    window.Notification = realNotification;
    window.MozActivity = realMozActivity;

    // XXX: Do not restore window's logshake, its time is over
  });

  suite('_notify sends proper notifications >', function() {
    var notifSpy;

    setup(function() {
      notifSpy = this.sinon.spy(window.NotificationHelper, 'send');
    });

    test('notification basics', function() {
      logshake._notify('title', 'body');
      sinon.assert.calledOnce(notifSpy);

      var args = notifSpy.firstCall.args;
      assert.equal(args[0], 'title');
      assert.equal(args[1].bodyL10n, 'body');
      assert.equal(args[1].tag, 'logshake:1');
      assert.equal(args[1].data.systemMessageTarget, 'logshake');
    });

    test('without notification click handler', function() {
      logshake._notify('title', 'body');
      sinon.assert.calledOnce(notifSpy);

      var notif = notifSpy.firstCall.returnValue;
      assert.isUndefined(notif.onclick);
    });

    test('with notification click handler', function(done) {
      logshake._notify('title', 'body', function() {});
      sinon.assert.calledOnce(notifSpy);

      var notifPromise = notifSpy.firstCall.returnValue;
      notifPromise.then(notif => {
        assert.isDefined(notif.onclick);
      }).then(done, done);
    });

    test('with payload', function() {
      var payload = { error: 'BADBAD' };
      logshake._notify('title', 'body', undefined, payload);
      sinon.assert.calledOnce(notifSpy);

      var data = notifSpy.firstCall.args[1].data;
      assert.isDefined(data.logshakePayload);
      assert.equal(data.logshakePayload, payload);
    });
  });

  suite('Capture start handling', function() {
    test('Create notification after capture-logs-start event', function() {
      var notificationSpy = this.sinon.spy(window.NotificationHelper, 'send');

      assert.equal(1, logshake._shakeId);

      window.dispatchEvent(
        new CustomEvent('capture-logs-start', { detail: {} }));

      assert.isNotNull(logshake._shakeId);
      assert.notEqual(1, logshake._shakeId);

      // LogShake should dispatch a notification of some kind
      assert.isTrue(notificationSpy.calledOnce,
        'Notification should be called');
      assert.equal(notificationSpy.firstCall.args[0],
        'logsSaving');
      assert.equal(logshake._shakeId, parseInt(logshake._shakeId));
      assert.equal(notificationSpy.firstCall.args[1].tag,
        logTagBase + logshake._shakeId);
    });
  });


  suite('Uncompressed LogShake', function() {
    var logFilenames = ['log.log', 'bog.log'];
    var logPrefix = 'logs/2014-06-03-00-00/';
    var logPaths = logFilenames.map(function(filename) {
      return logPrefix + filename;
    });
    var compressed = false;
    var logBlobs = logPaths.map(function(path) {
      return {
        type: 'text/plain',
        name: path
      };
    });

    suite('Capture success handling',
          captureSuccessSuite(logFilenames, logPaths, compressed, logBlobs));
  });

  suite('Compressed LogShake', function() {
    var logFilenames = ['log.log', 'bog.log'];
    var zipPath = 'logs/2014-06-03-00-00-logs.zip';
    var compressed = true;
    var zipBlob = {
      type: 'application/zip',
      name: zipPath
    };

    suite('Capture success handling',
          captureSuccessSuite(logFilenames, [zipPath], compressed, [zipBlob]));

  });

  function captureSuccessSuite(logFilenames, logPaths, compressed, mockBlobs) {
    var notificationSpy;

    setup(function() {
      notificationSpy = this.sinon.spy(window.NotificationHelper, 'send');

      window.dispatchEvent(new CustomEvent('capture-logs-success',
        { detail: { logFilenames: logFilenames, logPaths: logPaths,
                    compressed: compressed } }));
    });

    test('Notification sent', function() {
      assert.isNull(logshake._shakeId);
      assert.isTrue(notificationSpy.calledOnce);
      assert.equal(notificationSpy.firstCall.args[0],
        'logsSavedHeader');
      assert.equal(notificationSpy.firstCall.args[1].bodyL10n,
        'logsSavedBody');
      assert.equal(notificationSpy.firstCall.args[1].tag,
        expectedLogTag);
    });

    test('Clicking notification', function(done) {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var storageSpy = this.sinon.spy(navigator, 'getDeviceStorages');
      var getSpy = this.sinon.spy(mockDeviceStorage, 'get');

      var notifPromise = notificationSpy.firstCall.returnValue;
      notifPromise.then(notif => {
        notif.onclick();

        assert.isTrue(storageSpy.callCount > 0,
          'getDeviceStorage should be called at least once');
        assert.equal(getSpy.callCount, logPaths.length,
          '.get() should be called for all log paths');
        for (var i = 0; i < getSpy.callCount; i++) {
          assert.equal(getSpy.getCall(i).args[0], logPaths[i],
            '.get() should have been called with filename from event');
        }
      }).then(done, done);
    });

    suite('MozActivity handling', function() {
      var expectedActivity, mockDeviceStorage, notification, getSpy;
      var activityStub, closeSpy, closeSystemSpy;

      setup(function(done) {
        expectedActivity = {
          name: 'share',
          data: {
            type: 'application/vnd.moz-systemlog',
            blobs: mockBlobs,
            filenames: logFilenames
          }
        };

        mockDeviceStorage = MockNavigatorGetDeviceStorage();
        mockDeviceStorage._freeSpace = Number.MAX_VALUE;

        getSpy = this.sinon.spy(mockDeviceStorage, 'get');
        activityStub = this.sinon.stub(window, 'MozActivity', function() {
          return new MockDOMRequest();
        });

        var notifPromise = notificationSpy.firstCall.returnValue;
        notifPromise.then(notif => {
          notification = notif;
          closeSpy = notif.close;

          closeSystemSpy =
            this.sinon.spy(logshake, 'closeSystemMessageNotification');
        }).then(done, done);
      });

      function triggerGetSuccess() {
        // Simulate success of reading file
        for (var i = 0; i < getSpy.callCount; i++) {
          var getRequest = getSpy.getCall(i).returnValue;
          getRequest.fireSuccess(mockBlobs[i]);
        }
      }

      function triggerActivitySuccess() {
        for (var i = 0; i < activityStub.callCount; i++) {
          var activity = activityStub.getCall(i).returnValue;
          activity.fireSuccess();
        }
      }

      function triggerActivityError() {
        for (var i = 0; i < activityStub.callCount; i++) {
          var activity = activityStub.getCall(i).returnValue;
          activity.fireError();
        }
      }

      test('triggerShareLogs launches MozActivity', function() {
        logshake.triggerShareLogs(logPaths);

        triggerGetSuccess();

        sinon.assert.calledWith(activityStub, expectedActivity);
      });

      test('close notification with MozActivity success', function() {
        logshake.triggerShareLogs(logPaths, notification);

        triggerGetSuccess();
        triggerActivitySuccess();

        sinon.assert.calledOnce(closeSpy);
      });

      test('calls closeSystemMessageNotification with MozActivity success',
        function() {
          // Use an empty object since we just want one without 'close()'
          logshake.triggerShareLogs(logPaths, {});

          triggerGetSuccess();
          triggerActivitySuccess();

          sinon.assert.calledOnce(closeSystemSpy);
        });

      test('keep notification with MozActivity error', function() {
        logshake.triggerShareLogs(logPaths, notification);

        triggerGetSuccess();
        triggerActivityError();

        sinon.assert.notCalled(closeSpy);
      });

      test('dont call closeSystemMessageNotification with MozActivity error',
        function() {
          // Use an empty object since we just want one without 'close()'
          logshake.triggerShareLogs(logPaths, {});

          triggerGetSuccess();
          triggerActivityError();

          sinon.assert.notCalled(closeSystemSpy);
        });
    });
  }

  suite('Capture error handling >', function() {
    var notificationSpy, errorMessage,
        errorUnixSharedSD, errorUnixGeneric,
        errorNotFoundError, errorNotFoundErrorExpectedBody,
        errorUnixExpectedBody;

    function sendError(e) {
      assert.isNotNull(logshake._shakeId);
      window.dispatchEvent(new CustomEvent('capture-logs-error',
        { detail: { error: e } }));
      assert.isNull(logshake._shakeId);
    }

    function notificationAsserts(spy) {
      assert.isTrue(spy.calledOnce, 'Notification should be called');
      assert.isTrue(spy.calledWithNew(), 'Notification created with new');
      assert.equal(spy.firstCall.args[0], 'logsSaveError');
      assert.equal(spy.firstCall.args[1].tag, expectedLogTag);
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
      errorNotFoundError             = new DOMError('NotFoundError');
      errorUnixExpectedBody          =
        'logsOperationFailed{"operation":"makeDir"}';
      errorNotFoundErrorExpectedBody = 'logsNotFoundError';
    });

    test('Handling capture-logs-error event with string error', function() {
      sendError(errorMessage);
      notificationAsserts(notificationSpy);
      assertBody(errorMessage);
    });

    suite('Handling capture-logs-error event with errno >', function() {
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

      test('Handling NotFoundError', function() {
        sendError(errorNotFoundError);
        notificationAsserts(notificationSpy);
        assertBody(errorNotFoundErrorExpectedBody);
      });
    });

    suite('formatError behavior >', function() {
      test('formatError() with a string', function() {
        var error = 'Unknown error';
        var msg = logshake.formatError(error);
        assert.equal(msg, error);
      });

      test('formatError() with an object', function() {
        var error = {
          operation: 'makeDir',
          unixErrno: 30 // EROFS
        };
        var msg = logshake.formatError(error);
        assert.equal(msg, 'logsOperationFailed{"operation":"makeDir"}');
      });

      test('formatError() with a NotFoundError', function() {
        var msg = logshake.formatError(errorNotFoundError);
        assert.equal(msg, 'logsNotFoundError');
      });
    });

    suite('Clicking error notification >', function() {
      var notification, closeSpy, modalSpy;

      setup(function() {
        modalSpy = this.sinon.spy(MockModalDialog, 'alert');
      });

      test('Known errno', function() {
        sendError(errorUnixSharedSD);
        notification = notificationSpy.firstCall.thisValue;
        closeSpy = this.sinon.spy(notification, 'close');
        notification.onclick();
        assert.isTrue(modalSpy.calledWith('logsSaveError',
                                          'logsSDCardMaybeShared',
                                          { title: 'ok' }));
        sinon.assert.calledOnce(closeSpy);
      });

      test('Unknown errno', function() {
        sendError(errorUnixGeneric);
        notification = notificationSpy.firstCall.thisValue;
        closeSpy = this.sinon.spy(notification, 'close');
        notification.onclick();
        assert.isTrue(modalSpy.calledWith('logsSaveError',
                                          'logsGenericError',
                                          { title: 'ok' }));
        sinon.assert.calledOnce(closeSpy);
      });

      test('NotFoundError DOMError', function() {
        sendError(errorNotFoundError);
        notification = notificationSpy.firstCall.thisValue;
        closeSpy = this.sinon.spy(notification, 'close');
        notification.onclick();
        assert.isTrue(modalSpy.calledWith('logsShareError',
                                          'logsNotFoundError',
                                          { title: 'ok' }));
        sinon.assert.calledOnce(closeSpy);
      });
    });
  });

  suite('Use sdcard device storage', function() {
    var sdcard, sdcard1, extsdcard;
    var expected = 'sdcard';

    suiteSetup(function() {
      sdcard = { storageName: 'sdcard' };
      sdcard1 = { storageName: 'sdcard1' };
      extsdcard = { storageName: 'extsdcard' };
    });

    suite('only one device storage', function() {
      setup(function() {
        this.sinon.stub(navigator, 'getDeviceStorages')
          .withArgs('sdcard').returns([sdcard]);
      });

      test('device storage name is sdcard', function() {
        assert.equal(expected, logshake.getDeviceStorage().storageName);
      });
    });

    suite('multiple device storages', function() {
      setup(function() {
        this.sinon.stub(navigator, 'getDeviceStorages')
          .withArgs('sdcard').returns([sdcard, sdcard1, extsdcard]);
      });

      test('device storage name is sdcard', function() {
        assert.equal(expected, logshake.getDeviceStorage().storageName);
      });
    });
  });

  suite('System message notification >', function() {
    var serviceSpy;

    var notification = {
      body: 'fake',
      tag: 'logshake',
      data: {
        systemMessageTarget: 'logshake'
      },
      close: function() {}
    };

    suite('start/stop conditions', function() {
      setup(function() {
        logshake.stop();
      });

      teardown(function() {
        logshake.start();
      });

      test('.start() requests handleSystemMessageNotification service',
        function() {
          serviceSpy = this.sinon.spy(MockService, 'request');
          logshake.start();
          assert.isTrue(serviceSpy.calledOnce);
          assert.isTrue(serviceSpy.calledWith(
            'handleSystemMessageNotification', 'logshake', logshake));
          logshake.stop();
        });

      test('.stop() requests unhandleSystemMessageNotification service',
        function() {
          logshake.start();
          serviceSpy = this.sinon.spy(MockService, 'request');
          logshake.stop();
          assert.isTrue(serviceSpy.calledOnce);
          assert.isTrue(serviceSpy.calledWith(
            'unhandleSystemMessageNotification', 'logshake', logshake));
        });
    });

    suite('handleSystemMessageNotification behavior', function() {
      test('calls triggerShareLogs for success cases', function() {
        var triggerShareLogsSpy = this.sinon.spy(logshake, 'triggerShareLogs');
        notification.data.logshakePayload = { logPaths: [], logFilenames: [],
                                              compressed: false };
        logshake.handleSystemMessageNotification(notification);
        assert.isTrue(triggerShareLogsSpy.calledOnce);
        assert.isTrue(
          triggerShareLogsSpy.calledWith(
            notification.data.logshakePayload.logPaths));
        delete notification.data.logshakePayload;
      });

      test('calls showErrorMessage for error cases', function() {
        var showErrorMessageSpy = this.sinon.spy(logshake, 'showErrorMessage');
        notification.data.logshakePayload = { error: '' };
        logshake.handleSystemMessageNotification(notification);
        assert.isTrue(showErrorMessageSpy.calledOnce);
        assert.isTrue(
          showErrorMessageSpy.calledWith(
            notification.data.logshakePayload.error));
        delete notification.data.logshakePayload;
      });
    });

    suite('closeSystemMessageNotification behavior', function() {
      var notifCloseSpy, notificationGetStub;

      setup(function() {
        notifCloseSpy = this.sinon.spy(notification, 'close');
        notificationGetStub = function notificationGet() {
          return {
            then: function(cb) {
              cb && cb([ notification ]);
            }
          };
        };
        this.sinon.stub(window.Notification, 'get', notificationGetStub);
      });

      test('closes notification by tag', function() {
        logshake.closeSystemMessageNotification(notification);
        assert.isTrue(window.Notification.get.calledOnce);
        assert.isTrue(window.Notification.get.calledWith(
          { tag: notification.tag}));
        assert.isTrue(notifCloseSpy.calledOnce);
      });
    });
  });
});
