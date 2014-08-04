/* global BluetoothHelper, MockMozBluetooth, MockBTAdapter */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
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
    subject.toggleCalls();
    subject.toggleCalls();
    sandbox.spy(MockBTAdapter, 'toggleCalls');
    MockMozBluetooth.triggerOnGetAdapterSuccess();
    assert.isTrue(MockBTAdapter.toggleCalls.calledTwice);
  });

  ['enabled', 'adapteradded'].forEach(function(evtName) {
    test('should get adapter once ' + evtName, function() {
      sandbox.spy(MockMozBluetooth, 'getDefaultAdapter');
      MockMozBluetooth.triggerEventListeners(evtName);
      assert.isTrue(MockMozBluetooth.getDefaultAdapter.called);
    });
  });

  suite('public functions and setters', function() {
    setup(function() {
      MockMozBluetooth.triggerOnGetAdapterSuccess();
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

    test('should get connected devices by profile', function() {
      var stubDOMReq = {result: ['profiles']};
      sandbox.stub(MockBTAdapter, 'getConnectedDevices').returns(stubDOMReq);

      var cb = sinon.stub();
      subject.getConnectedDevicesByProfile('stubProfileId', cb);
      stubDOMReq.onsuccess();
      sinon.assert.calledOnce(cb);
      sinon.assert.calledWithExactly(cb, stubDOMReq.result);
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

    // pairing methods test
    test('should set pairing confirmation', function() {
      var address = '00:11:22:AA:BB:CC';
      var confirmed = true;
      sandbox.spy(MockBTAdapter, 'setPairingConfirmation');
      subject.setPairingConfirmation(address, confirmed);
      assert.isTrue(MockBTAdapter.setPairingConfirmation.calledWith(address,
                                                                    confirmed));
    });

    test('should set pin code', function() {
      var address = '00:11:22:AA:BB:CC';
      var pincode = 'SixteenTxtLength';
      sandbox.spy(MockBTAdapter, 'setPinCode');
      subject.setPinCode(address, pincode);
      assert.isTrue(MockBTAdapter.setPinCode.calledWith(address, pincode));
    });

    test('should set pass key', function() {
      var address = '00:11:22:AA:BB:CC';
      var passkey = 123456;
      sandbox.spy(MockBTAdapter, 'setPasskey');
      subject.setPasskey(address, passkey);
      assert.isTrue(MockBTAdapter.setPasskey.calledWith(address, passkey));
    });
  });
});
