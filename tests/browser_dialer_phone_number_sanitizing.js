function generatorTest() {
  waitForExplicitFinish();
  yield testApp('http://dialer.gaiamobile.org/', testDialerSanitizing);
  finish();
}

function testDialerSanitizing(window, document, nextStep) {

  window.navigator.mozTelephony.dial = function fake_dial(number) {
    ok(number == '5707534296', 'Phone number sanitized');
    var fakeCall = {number: '123', addEventListener: function() {}};
    return fakeCall;
  };

  // Wait for the call handler to be available
  yield until(function() window.CallHandler, nextStep);

  window.CallHandler.call('570-753-4296');
}
