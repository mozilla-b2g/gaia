/* global MockSimpleKeyNavigation, InteractiveNotifications, focusManager */

'use strict';
requireApp('smart-system/test/unit/mock_iac_handler.js');
requireApp('smart-system/test/unit/mock_simple_key_navigation.js');
requireApp('smart-system/bower_components/evt/index.js');
requireApp('smart-system/bower_components/smart-banner/script.js');
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
  var realSimpleKeyNavigation;
  var realFocusManager;
  var mockElements = {};

  function createMockElement(options) {
    var id = options.id;
    var mockOpenClose = options.mockOpenClose;
    var tagName = options.tagName || 'div';
    var element = document.createElement(tagName);
    element.id = id;
    if (mockOpenClose) {
      element.open = element.close = function(){};
      element.on = element.once = element.off = function(){};
    }
    if (tagName === 'smart-banner') {
      element.hide = element.flyOpen = function() {};
    }
    document.body.appendChild(element);
    return element;
  }

  function createMockUI() {
    // containerElement
    mockElements['notification-container'] = createMockElement({
      id: 'notification-container',
      mockOpenClose: true,
      tagName: 'smart-banner'
    });
    // buttonGroupElement
    mockElements['notification-button-group'] =
      createMockElement({id: 'notification-button-group'});
    // titleElement
    mockElements['notification-title'] =
      createMockElement({id: 'notification-title'});
    // bodyElement
    mockElements['notification-body'] =
      createMockElement({id: 'notification-body'});
    // button1Element
    mockElements['notification-button-0'] =
      createMockElement({id: 'notification-button-0'});
    // button2Element
    mockElements['notification-button-1'] =
     createMockElement({id: 'notification-button-1'});
  }

  // var getElementByIdStub;
  suiteSetup(function() {
    window.IACHandler = window.MockIACHandler;
    window.AppWindowManager = fakeAppWinMgr;
    realFocusManager = window.focusManager;
    window.focusManager = {
      focus: function() {},
      addUI: function() {}
    };
    realSimpleKeyNavigation = window.SimpleKeyNavigation;
    window.SimpleKeyNavigation = MockSimpleKeyNavigation;
    createMockUI();
  });

  suiteTeardown(function() {
    window.SimpleKeyNavigation = realSimpleKeyNavigation;
    window.focusManager = realFocusManager;
    mockElements = {};
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
    stubs.bannerHide =
      sinon.spy(mockElements['notification-container'], 'hide');
    stubs.focusManagerFocus = sinon.spy(focusManager, 'focus');
    fakeTimer = sinon.useFakeTimers();
  });

  teardown(function() {
    stubs.msg1Closed.restore();
    stubs.msg2Closed.restore();
    stubs.msg3Closed.restore();
    stubs.msg4Closed.restore();
    stubs.updateUISpy.restore();
    stubs.bannerHide.restore();
    stubs.focusManagerFocus.restore();
    fakeTimer.restore();
    testTarget.stop();
  });

  test('show normal notification without buttons', function() {
    testTarget.showNotification(TYPE.NORMAL, message1);
    assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message1));
    assert.isFalse(stubs.bannerHide.called);
    assert.isTrue(mockElements['notification-body'].textContent !== '');
    assert.isTrue(mockElements['notification-title'].textContent === '');
    fakeTimer.tick(5000);
    assert.isTrue(stubs.bannerHide.calledOnce);
  });

  test('show normal notification with buttons', function() {
    testTarget.showNotification(TYPE.NORMAL, message2);
    assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message2));
    assert.isTrue(mockElements['notification-title'].titleContent !== '');
    assert.isTrue(mockElements['notification-container'].classList.contains(
      'has-title'));
    assert.isFalse(stubs.bannerHide.called);
    fakeTimer.tick(5000);
    assert.isFalse(stubs.bannerHide.called);
    fakeTimer.tick(3000);
    assert.isTrue(stubs.bannerHide.calledOnce);
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
    testTarget.showNotification(TYPE.NORMAL, message1);
    fakeTimer.tick(5000);
    assert.isTrue(stubs.focusManagerFocus.calledOnce);
  });

  suite('> queue normal notification', function() {

    setup(function() {
      testTarget.showNotification(TYPE.NORMAL, message1);
      testTarget.showNotification(TYPE.NORMAL, message3);
    });

    test('> close first', function() {
      testTarget.hideNotification(TYPE.NORMAL, message1);
      assert.isTrue(stubs.bannerHide.called);
      testTarget.handleEvent({type: 'hidden'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.NORMAL, message3));
    });

    test('> auto hide first', function() {
      fakeTimer.tick(5000);
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isTrue(stubs.msg1Closed.called);
      fakeTimer.tick(5000);
      // recheck if onclosed is double called
      assert.isTrue(stubs.msg1Closed.calledOnce);
      // hide alert
      testTarget.hideNotification(TYPE.ALERT, message3);
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
      assert.isTrue(stubs.updateUISpy.calledWith(TYPE.ALERT, message3));
      assert.isTrue(stubs.msg1Closed.called);

      // hide alert 3
      testTarget.hideNotification(TYPE.ALERT, message3);
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
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
      testTarget.handleEvent({type: 'hidden'});
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
