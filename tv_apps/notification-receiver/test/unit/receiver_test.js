/* global MockPresentation, MockPresentationSession, MockNotification,
          Receiver */

'use strict';

require('/js/receiver.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_presentation.js');
require('/shared/test/unit/mocks/mock_presentation_session.js');

suite('notification-receiver/Receiver', function() {
  var receiver;
  var realPresentation;
  var realNotification;

  suiteSetup(function() {
    realPresentation = navigator.presentation;
    navigator.presentation = MockPresentation;

    realNotification = window.Notification;
    window.Notification = MockNotification;
  });

  suiteTeardown(function() {
    navigator.presentation = realPresentation;
    window.Notification = realNotification;
  });

  suite('init()', function() {
    // TODO: Since presentation API spec has changed, we need to re-write these
    // test cases and align them to new presentation API spec.

    setup(function() {
      this.sinon.spy(MockPresentationSession, 'addEventListener');
      receiver = new Receiver();
    });

    teardown(function() {
      MockPresentationSession.addEventListener.restore();
      navigator.presentation._mReset();
      receiver.uninit();
    });
    /*
    test('> should call handleStateChange once ' +
      'when session object is not ready', function() {
        this.sinon.spy(receiver, '_handleSessionReady');

        assert.isFalse(receiver._handleSessionReady.called);
        receiver.init();
        navigator.presentation._mInjectSession(
          MockPresentationSession._mCreateSession());
        assert.isTrue(receiver._handleSessionReady.calledOnce);
        assert.ok(
          MockPresentationSession.addEventListener.calledWith('message'));
        assert.isTrue(
          MockPresentationSession.addEventListener.calledWith('statechange'));
      });

    test('> _handleSessionReady should called once ' +
      'when session object is ready', function() {
        navigator.presentation._mInjectSession(
          MockPresentationSession._mCreateSession());
        this.sinon.spy(receiver, '_handleSessionReady');

        assert.isFalse(receiver._handleSessionReady.called);
        receiver.init();
        assert.isTrue(receiver._handleSessionReady.calledOnce);
        assert.ok(
          MockPresentationSession.addEventListener.calledWith('message'));
        assert.isTrue(
          MockPresentationSession.addEventListener.calledWith('statechange'));
      });
    */
  });

  suite('onmessage', function() {
    // TODO: Since presentation API spec has changed, we need to re-write these
    // test cases and align them to new presentation API spec.
    /*
    setup(function() {
      receiver = new Receiver();
      this.sinon.spy(receiver, '_handleMessage');
      navigator.presentation._mInjectSession(
        MockPresentationSession._mCreateSession());
      receiver.init();
    });

    teardown(function() {
      navigator.presentation._mReset();
      receiver.uninit();
    });

    test('should invoke _handleMessage', function() {
      // XXX: evt is subject to changed if we change message data format
      var evt = {
        data: JSON.stringify({
          type: 'start-ringing',
          call: '0987654321'
        })
      };
      MockPresentationSession._mFireEvent('message', evt);
      assert.isTrue(receiver._handleMessage.calledOnce);
    });
    */
  });

});
