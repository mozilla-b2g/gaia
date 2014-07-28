'use strict';

/* global FakeWindow */
/* global MessageBroadcaster */

requireApp('communications/contacts/js/broadcast_message.js');
requireApp('communications/contacts/test/unit/fake_window.js');

suite('Broadcast Messager', function() {

  var subject;
  var windowObj,receiverWindow;
  var secondBroadcaster;
  var EVENT_NAME = 'my_event';
  var EVENT_DATA = 'my_data';

  setup(function() {
    // Make it top by using the index.html
    windowObj = new FakeWindow('app://myapp.com/contacts/index.html');
    // This one is bottom
    receiverWindow = new FakeWindow('app://myapp.com/contacts/iframe.html');
    receiverWindow.parent = windowObj;
    this.sinon.stub(document, 'getElementsByTagName', function() {
      var iframe = {};
      iframe.contentWindow = receiverWindow;
      return [iframe];
    });

    subject = new MessageBroadcaster(windowObj);
    secondBroadcaster = new MessageBroadcaster(receiverWindow);

    this.sinon.spy(windowObj, 'postMessage');
    this.sinon.spy(receiverWindow, 'postMessage');
    this.sinon.spy(receiverWindow, 'addEventListener');
    this.sinon.spy(receiverWindow, 'removeEventListener');
  });

  suite('init', function() {
    setup(function() {
      subject = new MessageBroadcaster();
    });

    test('> Broadcast messenger present', function() {
      assert.isTrue('MessageBroadcaster' in window);
    });

    test('> Initialized', function() {
      assert.isNotNull(subject);
      // Check prototype
      assert.isNotNull(subject.on);
      assert.isNotNull(subject.fire);
      assert.isNotNull(subject.out);
    });
  });

  suite('Listening for messages', function() {
    test('> Registering for messages in top window', function() {
      var fn = function(){};

      subject.on(EVENT_NAME, fn);

      assert.isNotNull(subject.listeners);
      assert.isNotNull(subject.listeners[EVENT_NAME]);
      assert.equal(subject.listeners[EVENT_NAME][0], fn);
    });

    test('> Several registrations for messages in top window', function() {
      var fn1 = function(){};
      var fn2 = function(){};

      subject.on(EVENT_NAME, fn1);
      subject.on(EVENT_NAME, fn2);

      assert.isNotNull(subject.listeners);
      assert.isNotNull(subject.listeners[EVENT_NAME]);
      assert.equal(subject.listeners[EVENT_NAME].length, 2);
    });

    test('> Registering for messages in child window', function() {
      var fn = function(){};

      secondBroadcaster.on(EVENT_NAME, fn);

      assert.isNotNull(secondBroadcaster.listeners);
      assert.isNotNull(secondBroadcaster.listeners[EVENT_NAME]);
      assert.equal(secondBroadcaster.listeners[EVENT_NAME][0], fn);

      // We need to register for post message
      sinon.assert.calledOnce(receiverWindow.addEventListener);
    });

    test('> Opt out for receiving messages', function() {
      var fn = function(){};

      subject.on(EVENT_NAME, fn);
      subject.out(EVENT_NAME, fn);

      assert.isNotNull(subject.listeners);
      assert.isNotNull(subject.listeners[EVENT_NAME]);
      assert.equal(subject.listeners[EVENT_NAME].length, 0);
    });

    test('> Opt out for receiving messages and remove listener',
     function() {
      var fn = function(){};

      secondBroadcaster.on(EVENT_NAME, fn);
      secondBroadcaster.out(EVENT_NAME, fn);

      assert.isNotNull(secondBroadcaster.listeners);
      assert.isNotNull(secondBroadcaster.listeners[EVENT_NAME]);
      assert.equal(secondBroadcaster.listeners[EVENT_NAME].length, 0);

      // We need to unsubscribe to listen to post messages
      sinon.assert.calledOnce(receiverWindow.removeEventListener);
    });
  });

  suite('Firing messages', function() {

    test('> Firing message from inside', function() {
      subject.fire(EVENT_NAME, EVENT_DATA, false);

      // A single postMessage with known data in the
      // main window.
      sinon.assert.calledOnce(windowObj.postMessage);
      sinon.assert.calledWith(windowObj.postMessage, {
        broadcasted_message: EVENT_NAME,
        broadcasted_data: EVENT_DATA
      }, windowObj.location.origin);
      sinon.assert.notCalled(receiverWindow.postMessage);
    });

    test('> Firing message from inside in child', function() {
      secondBroadcaster.fire(EVENT_NAME, EVENT_DATA, false);

      // A single postmessage not in the current window object
      // but in the parent one
      sinon.assert.calledOnce(windowObj.postMessage);
      sinon.assert.notCalled(receiverWindow.postMessage);
    });

    test('> Firing message from outside in the top window', function() {
      subject.fire(EVENT_NAME, EVENT_DATA, true);

      // Message is broadcasted to all child views
      sinon.assert.calledOnce(receiverWindow.postMessage);
      sinon.assert.calledWith(receiverWindow.postMessage, {
        broadcasted_message: EVENT_NAME,
        broadcasted_data: EVENT_DATA
      }, '*');
    });

    test('> Executing callbacks when firing an event', function() {
      var cb = {
        stubbedMethod: function() {

        }
      };
      var spy = sinon.stub(cb, 'stubbedMethod');
      subject.on(EVENT_NAME, cb.stubbedMethod);

      subject.fire(EVENT_NAME, EVENT_DATA, true);

      sinon.assert.calledOnce(cb.stubbedMethod);
      sinon.assert.calledWith(cb.stubbedMethod, EVENT_DATA);

      spy.reset();
    });
  });

});