
function test() {
  waitForExplicitFinish();

  function testDialerKeypadAndFinish() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var WindowManager = contentWindow.Gaia.WindowManager;

    setTimeout(function() {
      var dialerFrame = WindowManager.launch('../dialer/dialer.html').element;
      waitFor(function() {
        let document = dialerFrame.contentWindow.document;

        var key1 = document.querySelector(".keyboard-key[data-value='1']");
        var key3 = document.querySelector(".keyboard-key[data-value='3']");

        EventUtils.sendMouseEvent({type: 'mousedown'}, key1);
        EventUtils.sendMouseEvent({type: 'mousedown'}, key3);
        EventUtils.sendMouseEvent({type: 'mousedown'}, key1);

        ok(document.getElementById('phone-number-view').textContent == '131',
           'Phone number view updated');

        finish();
      }, function() {
        let dialerWindow = dialerFrame.contentWindow;
        return 'KeyHandler' in dialerWindow && dialerWindow.document.querySelector(".keyboard-key[data-value='3']") != null;
      });
    }, 300);
  }

  waitFor(testDialerKeypadAndFinish, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow && 'WindowManager' in contentWindow.Gaia;
  });
}
