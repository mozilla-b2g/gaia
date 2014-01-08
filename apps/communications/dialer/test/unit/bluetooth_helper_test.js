'use strict';

requireApp('communications/dialer/test/unit/mock_mozbluetooth.js');
requireApp('communications/dialer/js/bluetooth_helper.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('bluetooth helper', function() {
  var subject;
  var realMozBluetooth;

  setup(function() {
    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    subject = new BluetoothHelper();
  });

  teardown(function() {
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  test('queued callbacks should be called after initializing', function() {
    subject.toggleCalls();
    subject.toggleCalls();
    var toggleCallsSpy = this.sinon.spy(MockBTAdapter, 'toggleCalls');
    MockMozBluetooth.triggerOnGetAdapterSuccess();
    assert.isTrue(toggleCallsSpy.calledTwice);
  });

  suite('public functions and setters', function() {
    setup(function() {
      MockMozBluetooth.triggerOnGetAdapterSuccess();
    });

    test('should answer waiting call', function() {
      var answerWaitingCallSpy =
        this.sinon.spy(MockBTAdapter, 'answerWaitingCall');
      subject.answerWaitingCall();
      assert.isTrue(answerWaitingCallSpy.calledOnce);
    });

    test('should ignore waiting call', function() {
      var ignoreWaitingCallSpy =
        this.sinon.spy(MockBTAdapter, 'ignoreWaitingCall');
      subject.ignoreWaitingCall();
      assert.isTrue(ignoreWaitingCallSpy.calledOnce);
    });

    test('should toggle calls', function() {
      var toggleCallsSpy = this.sinon.spy(MockBTAdapter, 'toggleCalls');
      subject.toggleCalls();
      assert.isTrue(toggleCallsSpy.calledOnce);
    });

    test('should get connected devices by profile', function() {
      var stubDOMReq = {result: ['profiles']};
      this.sinon.stub(MockBTAdapter, 'getConnectedDevices').returns(stubDOMReq);

      var cb = sinon.stub().throws('Passing wrong results to callback');
      cb.withArgs(stubDOMReq.result);

      subject.getConnectedDevicesByProfile('stubProfileId', cb);
      stubDOMReq.onsuccess();
      assert.isTrue(cb.calledOnce);
    });

    test('should connect to sco', function() {
      var stubDOMReq = {};
      this.sinon.stub(MockBTAdapter, 'connectSco').returns(stubDOMReq);

      var cb = sinon.stub();

      subject.connectSco(cb);
      stubDOMReq.onsuccess();
      assert.isTrue(cb.calledOnce);
    });

    test('should disconnect from sco', function() {
      var stubDOMReq = {};
      this.sinon.stub(MockBTAdapter, 'disconnectSco').returns(stubDOMReq);

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
  });
});
