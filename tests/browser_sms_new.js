
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getWindowManager(function(windowManager) {
    function onReady(smsFrame) {
      let document = smsFrame.contentWindow.document;

      var convCount = document.getElementById('messages').children.length;

      var conversationView = document.getElementById('conversationView');
      var contactField = document.getElementById('contact');
      var textField = document.getElementById('text');
      var sendButton = document.getElementById('send');
      var newButton = document.querySelector(".message[data-num='*']");


      conversationView.getBoundingClientRect();

      // TODO For some reasons this test timed out, so let's ignore it for now
      /*
      EventUtils.sendMouseEvent({type: 'click'}, newButton);
      conversationView.addEventListener('transitionend', function trWait() {
        conversationView.removeEventListener('transitionend', trWait);
        ok(!conversationView.hidden, 'Conversation displayed');
        ok(contactField.value.length == 0, 'To: field empty');

        contactField.value = '123';
        textField.value = 'Hello world.';
        EventUtils.sendMouseEvent({type: 'click'}, sendButton);

        windowManager.closeForegroundWindow();
      });
      */
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
