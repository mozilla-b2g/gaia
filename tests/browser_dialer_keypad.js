
function test() {
  SimpleTest.__appTestFinished = false;

  appTest('../dialer/dialer.html', function(dialerFrame) {
    waitFor(function() {
      let document = dialerFrame.contentWindow.document;

      var key1 = document.querySelector(".keyboard-key[data-value='1']");
      var key3 = document.querySelector(".keyboard-key[data-value='3']");

      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key3);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);

      ok(document.getElementById('phone-number-view').textContent == '131',
         'Phone number view updated');

      SimpleTest.__appTestFinished = true;
    }, function() {
      let dialerWindow = dialerFrame.contentWindow;
      return 'KeyHandler' in dialerWindow;
    });
  });
}
