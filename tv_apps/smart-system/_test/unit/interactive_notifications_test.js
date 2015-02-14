/* global InteractiveNotifications */

'use strict';
requireApp('smart-system/test/unit/mock_iac_handler.js');
requireApp('smart-system/js/interactive_notifications.js');

suite('interactive notifications', function() {
  var testTarget;
  var TYPE;
  var message1 = {
    'text': 'message1',
    'onClosed': function(){}
  };

  var message2 = {
    'title': 'title2',
    'text': 'message2',
    'buttons': [{'id': 'button-1', 'label': 'button1'}],
    'onClosed': function(){}
  };

  var message3 = {
    'text': 'message3',
    'onClosed': function(){}
  };

  var message4 = {
    'text': 'message4',
    'buttons': [{'id': 'button-2', 'label': 'button2'}],
    'onClosed': function(){}
  };

  var fakeApp = {
    'focus': function() {},
    'getTopMostWindow': function() {
      return this;
    }
  };

  var fakeAppWinMgr = {
    'getActiveApp': function() {
      return fakeApp;
    }
  };

  var stubs = {};
  var fakeTimer;
  var containerElement;
  var buttonGroupElement;
  var titleElement;
  var bodyElement;
  var button1Element;
  var button2Element;

  function createMockElement(id, mockOpenClose) {
    var element = document.createElement('div');
    element.id = id;
    if (mockOpenClose) {
      element.open = element.close = function(){};
      element.on = element.once = element.off = function(){};
    }
    document.body.appendChild(element);
    return element;
  }

  function createMockUI() {
    containerElement = createMockElement('notification-container', true);
    buttonGroupElement = createMockElement('notification-button-group');
    titleElement = createMockElement('notification-title');
    bodyElement = createMockElement('notification-body');
    button1Element = createMockElement('notification-button-0');
    button2Element = createMockElement('notification-button-1');
  }

  suiteSetup(function() {
    window.IACHandler = window.MockIACHandler;
    window.AppWindowManager = fakeAppWinMgr;
    createMockUI();
  });

  setup(function() {
    TYPE = InteractiveNotifications.TYPE;
    testTarget = new InteractiveNotifications();
    testTarget.start();

    stubs.msg1Closed = sinon.stub(message1, 'onClosed');
    stubs.msg2Closed = sinon.stub(message2, 'onClosed');
    stubs.msg3Closed = sinon.stub(message3, 'onClosed');
    stubs.msg4Closed = sinon.stub(message4, 'onClosed');
    stubs.updateUISpy = sinon.spy(testTarget, '_updateNotificationUI');
    fakeTimer = sinon.useFakeTimers();
  });

  teardown(function() {
    stubs.msg1Closed.restore();
    stubs.msg2Closed.restore();
    stubs.msg3Closed.restore();
    stubs.msg4Closed.restore();
    stubs.updateUISpy.restore();
    fakeTimer.restore();
    testTarget.stop();
  });

  test('show normal notification without buttons', function() {
    testTarget.showNotification(TYPE.NORMAL, message1);
    assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message1));
    assert.isFalse(stubs.msg1Closed.called);
    assert.isTrue(bodyElement.textContent !== '');
    assert.isTrue(titleElement.textContent === '');
    fakeTimer.tick(5000);
    assert.isTrue(stubs.msg1Closed.calledOnce);
  });

  test('show normal notification with buttons', function() {
    testTarget.showNotification(TYPE.NORMAL, message2);
    assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message2));
    assert.isTrue(titleElement.titleContent !== '');
    assert.isTrue(containerElement.classList.contains('has-title'));
    assert.isFalse(stubs.msg2Closed.called);
    fakeTimer.tick(5000);
    assert.isFalse(stubs.msg2Closed.called);
    fakeTimer.tick(3000);
    assert.isTrue(stubs.msg2Closed.calledOnce);
  });

  test('show alert notification without buttons', function() {
    testTarget.showNotification(TYPE.ALERT, message1);
    assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message1));
    assert.isFalse(stubs.msg1Closed.called);
    fakeTimer.tick(8000);
    assert.isFalse(stubs.msg1Closed.called);
  });

  test('show alert notification with buttons', function() {
    testTarget.showNotification(TYPE.ALERT, message2);
    assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message2));
    assert.isFalse(stubs.msg2Closed.called);
    fakeTimer.tick(8000);
    assert.isFalse(stubs.msg2Closed.called);
  });

  test('should set focus back after hideNotification()', function() {
    var stub = sinon.stub(fakeApp, 'focus');
    testTarget.showNotification(TYPE.NORMAL, message1);
    fakeTimer.tick(5000);
    assert.isTrue(stub.calledOnce);
  });

  suite('> queue normal notification', function() {

    setup(function() {
      testTarget.showNotification(TYPE.NORMAL, message1);
      testTarget.showNotification(TYPE.NORMAL, message3);
    });

    test('> close first', function() {
      testTarget.hideNotification(TYPE.NORMAL, message1);
      assert.isTrue(stubs.msg1Closed.called);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
    });

    test('> auto hide first', function() {
      fakeTimer.tick(5000);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.msg1Closed.called);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
    });

    test('> close wrong type (alert)', function() {
      testTarget.hideNotification(TYPE.ALERT, message1);
      assert.isFalse(stubs.msg1Closed.called);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
      assert.isFalse(stubs.msg3Closed.called);
    });

    test('> close wrong msg', function() {
      testTarget.hideNotification(TYPE.NORMAL, message2);
      assert.isFalse(stubs.msg1Closed.called);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
      assert.isFalse(stubs.msg3Closed.called);
    });

    test('> close queued', function() {
      testTarget.hideNotification(TYPE.NORMAL, message3);
      assert.isTrue(stubs.msg3Closed.called);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
      assert.isFalse(stubs.msg1Closed.called);
    });
  });

  suite('> queue alert notification', function() {

    setup(function() {
      testTarget.showNotification(TYPE.ALERT, message1);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message1));
      testTarget.showNotification(TYPE.ALERT, message3);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isFalse(stubs.msg3Closed.called);
    });

    test('> close first', function() {
      testTarget.hideNotification(TYPE.ALERT, message1);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.msg1Closed.called);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
    });

    test('> close wrong type (normal)', function() {
      testTarget.hideNotification(TYPE.NORMAL, message1);
      assert.isFalse(stubs.msg1Closed.called);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isFalse(stubs.msg3Closed.called);
    });

    test('> close wrong msg', function() {
      testTarget.hideNotification(TYPE.ALERT, message2);
      assert.isFalse(stubs.msg1Closed.called);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isFalse(stubs.msg3Closed.called);
    });

    test('> close queued', function() {
      testTarget.hideNotification(TYPE.ALERT, message3);
      assert.isTrue(stubs.msg3Closed.called);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isFalse(stubs.msg1Closed.called);
    });
  });

  suite('> notification priority from low to high', function() {

    setup(function() {
      testTarget.showNotification(TYPE.NORMAL, message1);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message1));
    });

    test('> show alert', function() {
      testTarget.showNotification(TYPE.ALERT, message3);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isTrue(stubs.msg1Closed.called);
      fakeTimer.tick(5000);
      // recheck if onclosed is double called
      assert.isTrue(stubs.msg1Closed.calledOnce);
    });

    test('> queue normal and show alert', function() {
      // 1, 2 is normal, 3 is alert
      testTarget.showNotification(TYPE.NORMAL, message2);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.NORMAL, message2));
      assert.isFalse(stubs.msg1Closed.called);
      testTarget.showNotification(TYPE.ALERT, message3);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isTrue(stubs.msg1Closed.called);
      fakeTimer.tick(5000);
      // recheck if onclosed is double called
      assert.isTrue(stubs.msg1Closed.calledOnce);
      // hide alert
      testTarget.hideNotification(TYPE.ALERT, message3);
      testTarget._handleTransition({'propertyName': 'opacity'});
      // check queued normal
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message2));
      assert.isTrue(stubs.msg3Closed.called);
    });
  });

  suite('> notification priority from high to low', function() {

    setup(function() {
      testTarget.showNotification(TYPE.ALERT, message1);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message1));
    });

    test('> show alert', function() {
      // 1 is alert, 3 is normal
      testTarget.showNotification(TYPE.NORMAL, message3);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
      assert.isFalse(stubs.msg1Closed.called);
      // hide alert
      testTarget.hideNotification(TYPE.ALERT, message1);
      testTarget._handleTransition({'propertyName': 'opacity'});
      // check queued
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
      assert.isTrue(stubs.msg1Closed.called);
    });

    test('> queue normal, show alert, and hide previous alert', function() {
      // 2 is normal, 1, 3 is alert
      // queue normal
      testTarget.showNotification(TYPE.NORMAL, message2);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.NORMAL, message2));
      assert.isFalse(stubs.msg1Closed.called);

      // queue alert
      testTarget.showNotification(TYPE.ALERT, message3);
      assert.isFalse(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isFalse(stubs.msg1Closed.called);

      // hide alert 1
      testTarget.hideNotification(TYPE.ALERT, message1);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isTrue(stubs.msg1Closed.called);

      // hide alert 3
      testTarget.hideNotification(TYPE.ALERT, message3);
      testTarget._handleTransition({'propertyName': 'opacity'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message2));
      assert.isTrue(stubs.msg3Closed.called);
    });
  });

  suite('IAC Connections', function() {
    var port = {
      postMessage: function(data){}
    };
    var portStub;
    var postedData;

    function sendIACMessage(id, type, message) {
      var iacEvt = document.createEvent('CustomEvent');
      iacEvt.initCustomEvent('iac-interactivenotifications',
        /* canBubble: */ true, /* cancelable */ false, {
          'id': id,
          'type': type,
          'message': message
        });

      window.dispatchEvent(iacEvt);
    }

    suiteSetup(function() {
      window.MockIACHandler._portMap.interactivenotifications = port;
    });

    suiteTeardown(function() {
      window.MockIACHandler.reset();
    });

    setup(function() {
      portStub = sinon.stub(port, 'postMessage', function(data) {
        postedData = data;
      });
    });

    teardown(function() {
      portStub.restore();
    });

    test('send normal', function() {
      sendIACMessage('a', TYPE.NORMAL, message1);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message1));
      // auto hide
      fakeTimer.tick(5000);
      assert.isTrue(portStub.calledOnce);
      assert.equal('notification-closed', postedData.action);
      assert.equal('a', postedData.id);
      assert.equal(TYPE.NORMAL, postedData.type);
      assert.isUndefined(postedData.button);
    });

    test('send alert', function() {
      sendIACMessage('a', TYPE.ALERT, message1);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message1));
      assert.isFalse(portStub.calledOnce);
      // hide alert
      testTarget.hideNotification(TYPE.ALERT, message1);
      assert.isTrue(portStub.calledOnce);
      assert.equal('notification-closed', postedData.action);
      assert.equal('a', postedData.id);
      assert.equal(TYPE.ALERT, postedData.type);
      assert.isUndefined(postedData.button);
    });

    test('hide normal with button', function() {
      sendIACMessage('a', TYPE.NORMAL, message1);
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message1));

      testTarget.hideNotification(TYPE.NORMAL, message1, 'buttonX');
      assert.isTrue(portStub.calledOnce);
      assert.equal('notification-closed', postedData.action);
      assert.equal('a', postedData.id);
      assert.equal(TYPE.NORMAL, postedData.type);
      assert.equal('buttonX', postedData.button);

      // check auto hide
      fakeTimer.tick(5000);
      assert.isTrue(portStub.calledOnce);
    });
  });
});
