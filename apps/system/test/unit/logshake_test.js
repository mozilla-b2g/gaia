'use strict';
/* global LogShake,
          MockDOMRequest,
          MockModalDialog,
          MockMozActivity,
          MockNavigatorGetDeviceStorage,
          MockNotification,
          MockL10n,
          MockService,
          MocksHelper
*/

require('/js/devtools/logshake.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/test/unit/mocks/mock_service.js');
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
  var realNotification;
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

    realDOMRequest = window.DOMRequest;
    window.DOMRequest = MockDOMRequest;

    realModalDialog = window.ModalDialog;
    window.ModalDialog = MockModalDialog;

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

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
    navigator.mozL10n = realL10n;
    window.Notification = realNotification;
    window.MozActivity = realMozActivity;

    // XXX: Do not restore window's logshake, its time is over
  });

  suite('_notify sends proper notifications >', function() {
    var notifSpy;

    setup(function() {
      notifSpy = this.sinon.spy(window, 'Notification');
    });

    test('notification basics', function() {
      logshake._notify('title', 'body');
      sinon.assert.calledOnce(notifSpy);
      sinon.assert.calledWithNew(notifSpy);

      var args = notifSpy.firstCall.args;
      assert.equal(args[0], 'title');
      assert.equal(args[1].body, 'body');
      assert.equal(args[1].tag, 'logshake:1');
      assert.equal(args[1].data.systemMessageTarget, 'logshake');
    });

    test('without notification click handler', function() {
      logshake._notify('title', 'body');
      sinon.assert.calledOnce(notifSpy);

      var notif = notifSpy.firstCall.returnValue;
      assert.isUndefined(notif.onclick);
    });

    test('with notification click handler', function() {
      logshake._notify('title', 'body', function() {});
      sinon.assert.calledOnce(notifSpy);

      var notif = notifSpy.firstCall.returnValue;
      assert.isDefined(notif.onclick);
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
      var notificationSpy = this.sinon.spy(window, 'Notification');

      assert.equal(1, logshake._shakeId);

      window.dispatchEvent(
        new CustomEvent('capture-logs-start', { detail: {} }));

      assert.isNotNull(logshake._shakeId);
      assert.notEqual(1, logshake._shakeId);

      // LogShake should dispatch a notification of some kind
      assert.isTrue(notificationSpy.calledOnce,
        'Notification should be called');
      assert.isTrue(notificationSpy.calledWithNew(),
        'Notification should be called with new');
      assert.equal(notificationSpy.firstCall.args[0],
        'logsSaving');
      assert.equal(logshake._shakeId, parseInt(logshake._shakeId));
      assert.equal(notificationSpy.firstCall.args[1].tag,
        logTagBase + logshake._shakeId);
    });
  });

  suite('Capture success handling', function() {
    var filename = 'logs/2014-06-03-00-00/log.log';
    var notificationSpy;

    setup(function() {
      notificationSpy = this.sinon.spy(window, 'Notification');

      window.dispatchEvent(new CustomEvent('capture-logs-success',
        { detail: { logFilenames: [filename]  } }));
    });

    test('Notification sent', function() {
      assert.isNull(logshake._shakeId);
      assert.isTrue(notificationSpy.calledOnce);
      assert.isTrue(notificationSpy.calledWithNew());
      assert.equal(notificationSpy.firstCall.args[0],
        'logsSaved');
      assert.equal(notificationSpy.firstCall.args[1].body,
        'logsSavedBody');
      assert.equal(notificationSpy.firstCall.args[1].tag,
        expectedLogTag);
    });

    test('Clicking notification', function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var storageSpy = this.sinon.spy(navigator, 'getDeviceStorage');
      var getSpy = this.sinon.spy(mockDeviceStorage, 'get');

      var notification = notificationSpy.firstCall.thisValue;
      var closeSpy = this.sinon.spy(notification, 'close');
      notification.onclick();

      assert.isTrue(storageSpy.calledOnce, 'getDeviceStorage should be called');
      assert.isTrue(getSpy.calledOnce, '.get() should be called');
      assert.equal(getSpy.firstCall.args[0], filename,
        '.get() should have been called with filename from event');
      sinon.assert.calledOnce(closeSpy);
    });

    test('triggerShareLogs launches MozActivity', function() {
      var filename = 'dev-log-main.log';
      var mockBlob = {
        type: 'text/plain',
        name: 'logs/timestamp/dev-log-main.log'
      };

      var expectedActivity = {
        name: 'share',
        data: {
          type: 'application/vnd.moz-systemlog',
          blobs: [ mockBlob ],
          filenames: [ filename ]
        }
      };

      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      mockDeviceStorage._freeSpace = Number.MAX_VALUE;

      var getSpy = this.sinon.spy(mockDeviceStorage, 'get');
      var activitySpy = this.sinon.spy(window, 'MozActivity');

      logshake.triggerShareLogs([ filename ]);

      // Simulate success of reading file
      var getRequest = getSpy.getCall(0).returnValue;
      getRequest.fireSuccess(mockBlob);
      assert.isTrue(activitySpy.calledWith(expectedActivity));
    });
  });

  suite('Capture error handling >', function() {
    var notificationSpy, errorMessage,
        errorUnixSharedSD, errorUnixGeneric,
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
      errorUnixExpectedBody = 'logsOperationFailed{"operation":"makeDir"}';
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
        notification.data.logshakePayload = { logFilenames: [] };
        logshake.handleSystemMessageNotification(notification);
        assert.isTrue(triggerShareLogsSpy.calledOnce);
        assert.isTrue(
          triggerShareLogsSpy.calledWith(
            notification.data.logshakePayload.logFilenames));
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

      test('calls closeSystemMessageNotification',
        function() {
          var closeSpy =
            this.sinon.spy(logshake, 'closeSystemMessageNotification');
          logshake.handleSystemMessageNotification(notification);
          assert.isTrue(closeSpy.calledOnce);
          assert.isTrue(closeSpy.calledWith(notification));
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
