
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getWindowManager(function(windowManager) {
    function onReady(smsFrame) {
      let document = smsFrame.contentWindow.document;

      let conversationView = document.getElementById('view');
      let contactField = document.getElementById('view-num');

      let textField = document.getElementById('view-msg-text');
      let sendButton = document.getElementById('view-msg-send');
      let newButton = document.getElementById('msg-new-message');

      EventUtils.sendMouseEvent({type: 'click'}, newButton);
      conversationView.addEventListener('transitionend', function trWait() {
        conversationView.removeEventListener('transitionend', trWait);
        ok(document.body.classList.contains('conversation'),
           'Conversation displayed');
        ok(contactField.value.length == 0, 'To: field empty');

        windowManager.closeForegroundWindow();
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
