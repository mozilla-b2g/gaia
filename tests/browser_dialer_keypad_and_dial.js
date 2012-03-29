function generatorTest() {
  waitForExplicitFinish();
  yield testApp('http://dialer.gaiamobile.org/', testDialerKeypad);
  finish();
}

function testDialerKeypad(window, document, nextStep) {
  function pressKey(button) {
    var selector = '.keyboard-key[data-value="' + button + '"]';
    var key = document.querySelector(selector);
    EventUtils.sendMouseEvent({type: 'mousedown'}, key);
  }

  //declare each of the keys
  function dialNumeric(sequence) {
    for (var i = 0; i < sequence.length; i++) {
      pressKey(sequence[i]);
    }
  }

  var keyCall = document.querySelector('.keyboard-key[data-value="call"]');
  var keyEnd = document.getElementById('end-call');

  // Having declared the keys, enter the number "15555215556"
  dialNumeric('15555215556');

  // Verify the phone number view contains the correct number
  ok(document.getElementById('phone-number-view').textContent == '15555215556',
     'Phone number view updated');


  //dial the number
  EventUtils.sendMouseEvent({type: 'click'}, keyCall);

  var callScreen = window.CallHandler.callScreen;

  // Wait until the call screen appears
  yield until(function() callScreen.classList.contains('oncall'), nextStep);
  ok(callScreen.classList.contains('oncall'), 'CallScreen displayed');

  //hit 'end-call' button to end the call
  EventUtils.sendMouseEvent({type: 'click'}, keyEnd);

  // simulating the end of the call
  window.CallHandler.disconnected();

  // Wait for the call screen to be hidden
  yield until(function() !callScreen.classList.contains('oncall'), nextStep);
  ok(!callScreen.classList.contains('oncall'), 'CallScreen hidden');
}
