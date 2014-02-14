'use strict';
/* global DialerComms, MocksHelper, IACHandler */

requireApp('system/test/unit/mock_iachandler.js');
requireApp('system/js/dialercomms.js');

mocha.globals(['addEventListener']);

var mocksHelperForDialercomms = new MocksHelper([
  'IACHandler'
]).init();

suite('Inter App Communication with Dialer', function() {
  mocksHelperForDialercomms.attachTestHelpers();
  var subject;

  test('should listen to sleep and volumedown events', function() {
    var addEventListenerSpy = this.sinon.spy(window, 'addEventListener');
    subject = new DialerComms();
    assert.isTrue(addEventListenerSpy.calledWith('sleep'));
    assert.isTrue(addEventListenerSpy.calledWith('volumedown'));
  });

  test('should send a message to stop the ringtone', function() {
    subject = new DialerComms();
    var postMessageSpy = this.sinon.spy();
    var portStub = this.sinon.stub(IACHandler, 'getPort');
    portStub.returns({postMessage: postMessageSpy});

    var evt = new CustomEvent('sleep');
    window.dispatchEvent(evt);

    assert.isTrue(portStub.calledWith('dialercomms'));
    assert.isTrue(postMessageSpy.calledWith('stop_ringtone'));
  });
});
