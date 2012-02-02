
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getApplicationManager(function(launcher) {
    function onReady(dialerFrame) {
      let document = dialerFrame.contentWindow.document;

      var key1 = document.querySelector(".keyboard-key[data-value='1']");
      var key3 = document.querySelector(".keyboard-key[data-value='3']");

      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key3);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);

      ok(document.getElementById('phone-number-view').textContent == '131',
         'Phone number view updated');

      launcher.close();
    }

    function onClose() {
      launcher.kill(url);
      finish();
    }

    let application = launcher.launch(url);
    ApplicationObserver(application, onReady, onClose);
  });
}
