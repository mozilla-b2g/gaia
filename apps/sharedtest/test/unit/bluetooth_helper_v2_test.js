/* global BluetoothHelper, MockMozBluetooth, MockBTAdapter */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth_v2.js');
require('/shared/js/bluetooth_helper.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('bluetooth helper', function() {
  var subject;
  var realMozBluetooth;
  var sandbox = sinon.sandbox.create();

  setup(function() {
    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    subject = new BluetoothHelper();
  });

  teardown(function() {
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
    sandbox.restore();
  });

  test('queued callbacks should be called after initializing', function() {
    sandbox.spy(MockBTAdapter, 'toggleCalls');
    subject.toggleCalls();
    subject.toggleCalls();

    assert.isTrue(MockBTAdapter.toggleCalls.calledTwice);
  });

  suite('public functions and setters', function() {
    test('should able to enable bluetooth', function() {
      sandbox.spy(MockBTAdapter, 'enable');
      subject.enable();

      assert.isTrue(MockBTAdapter.enable.calledOnce);
    });

    test('should able to disable bluetooth', function() {
      sandbox.spy(MockBTAdapter, 'disable');
      subject.disable();

      assert.isTrue(MockBTAdapter.disable.calledOnce);
    });

    test('should answer waiting call', function() {
      sandbox.spy(MockBTAdapter, 'answerWaitingCall');
      subject.answerWaitingCall();
  
      assert.isTrue(MockBTAdapter.answerWaitingCall.calledOnce);
    });

    test('should ignore waiting call', function() {
      sandbox.spy(MockBTAdapter, 'ignoreWaitingCall');
      subject.ignoreWaitingCall();
  
      assert.isTrue(MockBTAdapter.ignoreWaitingCall.calledOnce);
    });

    test('should toggle calls', function() {
      sandbox.spy(MockBTAdapter, 'toggleCalls');
      subject.toggleCalls();
  
      assert.isTrue(MockBTAdapter.toggleCalls.calledOnce);
    });

    test('should connect to sco', function() {
      var stubDOMReq = {};
      sandbox.stub(MockBTAdapter, 'connectSco').returns(stubDOMReq);
      var cb = sinon.stub();
      subject.connectSco(cb);

      stubDOMReq.onsuccess();
      assert.isTrue(cb.calledOnce);
    });

    test('should disconnect from sco', function() {
      var stubDOMReq = {};
      sandbox.stub(MockBTAdapter, 'disconnectSco').returns(stubDOMReq);
      var cb = sinon.stub();
      subject.disconnectSco(cb);

      stubDOMReq.onsuccess();
      assert.isTrue(cb.calledOnce);
    });

    test('should set callback on onhfpstatuschanged', function() {
      var stubFunc = this.sinon.stub();
      subject.onhfpstatuschanged = stubFunc;

      assert.equal(MockBTAdapter.onhfpstatuschanged, stubFunc);
    });

    test('should set callback on onscostatuschanged', function() {
      var stubFunc = this.sinon.stub();
      subject.onscostatuschanged = stubFunc;

      assert.equal(MockBTAdapter.onscostatuschanged, stubFunc);
    });

    test('should set callback on ona2dpstatuschanged', function() {
      var stubFunc = this.sinon.stub();
      subject.ona2dpstatuschanged = stubFunc;

      assert.equal(MockBTAdapter.ona2dpstatuschanged, stubFunc);
    });

    test('should set callback on onrequestmediaplaystatus', function() {
      var stubFunc = this.sinon.stub();
      subject.onrequestmediaplaystatus = stubFunc;

      assert.equal(MockBTAdapter.onrequestmediaplaystatus, stubFunc);
    });

    test('should check sco connected state', function() {
      var stubDOMReq = {};
      sandbox.stub(MockBTAdapter, 'isScoConnected').returns(stubDOMReq);
      var cb = sinon.stub();
      var errorcb = sinon.stub();
      subject.isScoConnected(cb, errorcb);

      stubDOMReq.onsuccess();
      assert.ok(cb.called);
      stubDOMReq.onerror();
      assert.ok(errorcb.called);
    });

    test('should send media meta-data', function() {
      var stubDOMReq = {};
      sandbox.stub(MockBTAdapter, 'sendMediaMetaData').returns(stubDOMReq);
      var cb = sinon.stub();
      var errorcb = sinon.stub();
      subject.sendMediaMetaData({}, cb, errorcb);

      stubDOMReq.onsuccess();
      assert.ok(cb.called);
      stubDOMReq.onerror();
      assert.ok(errorcb.called);
    });

    test('should send media play status', function() {
      var stubDOMReq = {};
      sandbox.stub(MockBTAdapter, 'sendMediaPlayStatus').returns(stubDOMReq);
      var cb = sinon.stub();
      var errorcb = sinon.stub();
      subject.sendMediaPlayStatus({}, cb, errorcb);

      stubDOMReq.onsuccess();
      assert.ok(cb.called);
      stubDOMReq.onerror();
      assert.ok(errorcb.called);
    });
  });
});
