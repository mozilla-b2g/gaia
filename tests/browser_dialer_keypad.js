
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let document = dialerFrame.contentWindow.document;

      var key1 = document.querySelector(".keyboard-key[data-value='1']");
      var key3 = document.querySelector(".keyboard-key[data-value='3']");

      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key3);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);

      ok(document.getElementById('phone-number-view').textContent == '131',
         'Phone number view updated');

      windowManager.closeForegroundWindow();
    }

    function onClose() {
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
