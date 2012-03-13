function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let document = dialerFrame.contentWindow.document;
      function pressKey(button) {
        var key = document.querySelector('.keyboard-key[data-value="' + button + '"]');
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

      //Having declared the keys, enter the number "15555215556"
      dialNumeric('15555215556');

      //Verify the phone number view contains the correct number
      ok(document.getElementById('phone-number-view').textContent == '15555215556',
        'Phone number view updated');

      //dial the number
      EventUtils.sendMouseEvent({type: 'click'}, keyCall);


      var callScreen = dialerFrame.contentWindow.CallHandler.callScreen;

      callScreen.addEventListener('transitionend', function trWait() {
        callScreen.removeEventListener('transitionend', trWait);
        ok(callScreen.classList.contains('oncall'), 'CallScreen displayed');

        //hit 'end-call' button to end the call
        EventUtils.sendMouseEvent({type: 'click'}, keyEnd);
        // simulating the end of the call
        dialerFrame.contentWindow.CallHandler.disconnected();

        callScreen.addEventListener('transitionend', function trWait() {
          callScreen.removeEventListener('transitionend', trWait);
          ok(!callScreen.classList.contains('oncall'), 'CallScreen hidden');

          windowManager.closeForegroundWindow();
        });
      });
    }

    function onClose() {
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
