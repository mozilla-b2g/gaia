'use strict';

requireApp('system/test/unit/mock_iachandler.js');

var mocksHelperForDialercomms = new MocksHelper([
  'IACHandler'
]).init();

suite('Inter App Communication with Dialer', function() {
  mocksHelperForDialercomms.attachTestHelpers();

  test('should listen to sleep and volumedown events', function(done) {
    var addEventListenerSpy = this.sinon.spy(window, 'addEventListener');
    requireApp('system/js/dialercomms.js', function() {
      assert.isTrue(addEventListenerSpy.calledWith('sleep'));
      assert.isTrue(addEventListenerSpy.calledWith('volumedown'));
      done();
    });
  });

  test('should send a message to stop the ringtone', function() {
    var postMessageSpy = this.sinon.spy();
    var portStub = this.sinon.stub(IACHandler, 'getPort');
    portStub.returns({postMessage: postMessageSpy});

    var evt = new CustomEvent('sleep');
    window.dispatchEvent(evt);

    assert.isTrue(portStub.calledWith('dialercomms'));
    assert.isTrue(postMessageSpy.calledWith('stop_ringtone'));
  });
});
