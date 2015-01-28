/* global BaseModule,
          MockNavigatormozSetMessageHandler,
          MockNotification
 */

'use strict';

require('/js/service.js');
require('/js/base_module.js');
require('/js/notifications_system_message.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

suite('system/NotificationsSystemMessage >', function() {
  var subject;
  var realMozSetMessageHandler;
  var realNotification;

  var systemMessageHandlerSpy;
  var processSystemMessageSpy;

  suiteSetup(function() {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    realNotification = window.Notification;
    window.Notification = MockNotification;
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    window.Notification = realNotification;
  });

  setup(function() {
    subject = BaseModule.instantiate('NotificationsSystemMessage');
    systemMessageHandlerSpy = this.sinon.spy(navigator, 'mozSetMessageHandler');
    processSystemMessageSpy = this.sinon.spy(subject, 'processSystemMessage');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('starting installs system message handler', function() {
    sinon.assert.calledOnce(systemMessageHandlerSpy);
    sinon.assert.calledWith(systemMessageHandlerSpy, 'notification');
  });

  suite('targets registration >', function() {
    var ctxt = {}, ctxt2 = {};
    var moduleName = 'module';

    test('registerTarget() with a new module', function() {
      subject.registerTarget(moduleName, ctxt, {});
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.isDefined(subject._handlers[moduleName]);
      assert.isDefined(subject._handlers[moduleName].name);
      assert.equal(subject._handlers[moduleName].name, moduleName);
      assert.isDefined(subject._handlers[moduleName].context);
    });

    test('unregisterTarget() valid module and context', function() {
      subject.registerTarget(moduleName, ctxt, {});
      assert.equal(Object.keys(subject._handlers).length, 1);

      subject.unregisterTarget(moduleName, ctxt);
      assert.equal(Object.keys(subject._handlers).length, 0);
      assert.isUndefined(subject._handlers[moduleName]);
    });

    test('registerTarget() refuses second same', function() {
      subject.registerTarget(moduleName, ctxt, {});
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.equal(subject._handlers[moduleName].context, ctxt);

      subject.registerTarget(moduleName, ctxt2, {});
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.equal(subject._handlers[moduleName].context, ctxt);

      // Cleanup
      subject.unregisterTarget(moduleName, ctxt);
    });

    test('unregisterTarget() with invalid module', function() {
      subject.registerTarget(moduleName, ctxt, {});
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.equal(subject._handlers[moduleName].context, ctxt);

      subject.unregisterTarget('module2', ctxt);
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.equal(subject._handlers[moduleName].context, ctxt);

      // Cleanup
      subject.unregisterTarget(moduleName, ctxt);
    });

    test('unregisterTarget() with invalid context', function() {
      subject.registerTarget(moduleName, ctxt, {});
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.equal(subject._handlers[moduleName].context, ctxt);

      subject.unregisterTarget(moduleName, ctxt2);
      assert.equal(Object.keys(subject._handlers).length, 1);
      assert.equal(subject._handlers[moduleName].context, ctxt);

      // Cleanup
      subject.unregisterTarget(moduleName, ctxt);
    });
  });

  suite('processSystemMessage >', function() {
    var closeCompatSpy, checkTargetSpy, callTargetSpy;

    setup(function() {
      closeCompatSpy = this.sinon.spy(subject, 'closeOldNotification');
      checkTargetSpy = this.sinon.spy(subject, 'hasRegisteredTarget');
      callTargetSpy = this.sinon.spy(subject, 'callRegisteredTarget');
    });

    test('system message triggers processSystemMessage', function() {
      MockNavigatormozSetMessageHandler.mTrigger('notification', {});
      sinon.assert.calledOnce(processSystemMessageSpy);
    });

    test('does nothing with nothing', function() {
      MockNavigatormozSetMessageHandler.mTrigger('notification', {});
      sinon.assert.notCalled(closeCompatSpy);
      sinon.assert.notCalled(checkTargetSpy);
      sinon.assert.notCalled(callTargetSpy);
    });

    test('old notification', function() {
      var msg = { clicked: true };
      MockNavigatormozSetMessageHandler.mTrigger('notification', msg);
      sinon.assert.calledOnce(closeCompatSpy);
      sinon.assert.notCalled(checkTargetSpy);
      sinon.assert.notCalled(callTargetSpy);
    });

    test('new notification', function() {
      var msg = { clicked: true, data: { systemMessageTarget: 'module' } };
      MockNavigatormozSetMessageHandler.mTrigger('notification', msg);
      sinon.assert.notCalled(closeCompatSpy);
      sinon.assert.calledOnce(checkTargetSpy);
      sinon.assert.notCalled(callTargetSpy);
    });
  });

  suite('closeOldNotification behavior', function() {
    var notification, systemMessageNotification;
    var notifCloseSpy, notificationGetStub, warnSpy;

    var timestamp = new Date().getTime();

    setup(function() {
      notification = {
        title: 'FakeScreenshot',
        body: 'fake',
        tag: 'screenshot:' + timestamp,
        close: function() {}
      };

      systemMessageNotification = {
        title: 'FakeScreenshot',
        body: 'fake',
        tag: 'screenshot:' + timestamp
      };

      notifCloseSpy = this.sinon.spy(notification, 'close');
      warnSpy = this.sinon.spy(console, 'warn');
      notificationGetStub = function notificationGet() {
        return {
          then: function(cb) {
            cb && cb([ notification ]);
          }
        };
      };

      this.sinon.stub(window.Notification, 'get', notificationGetStub);
    });

    test('close old matching notification', function() {
      subject.closeOldNotification(systemMessageNotification);
      assert.isTrue(window.Notification.get.calledOnce);
      assert.isTrue(notifCloseSpy.calledOnce);
      assert.isTrue(warnSpy.calledOnce);
    });

    test('close old matching notification with undefined fields', function() {
      notification.tag = '';
      systemMessageNotification.tag = undefined;
      subject.closeOldNotification(systemMessageNotification);
      assert.isTrue(window.Notification.get.calledOnce);
      assert.isTrue(notifCloseSpy.calledOnce);
      assert.isTrue(warnSpy.calledOnce);
    });

    test('do not close notification with systemMessageTarget', function() {
      notification.data = { systemMessageTarget: 'screenshot' };
      systemMessageNotification.data = { systemMessageTarget: 'screenshot' };
      subject.closeOldNotification(systemMessageNotification);
      assert.isTrue(window.Notification.get.calledOnce);
      assert.isTrue(notifCloseSpy.notCalled);
      assert.isTrue(warnSpy.notCalled);
    });
  });
});
