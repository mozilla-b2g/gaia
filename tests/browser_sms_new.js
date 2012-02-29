
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getWindowManager(function(windowManager) {
    function onReady(smsFrame) {
      let document = smsFrame.contentWindow.document;

      var conversationView = document.getElementById('msg-conversation-view');
      var contactField = document.getElementById('msg-conversation-view-num');

      var textField = document.getElementById('msg-conversation-view-msg-text');
      var sendButton = document.getElementById('msg-conversation-view-msg-send');
      var newButton = document.getElementById('msg-new-message');

      EventUtils.sendMouseEvent({type: 'click'}, newButton);
      conversationView.addEventListener('transitionend', function trWait() {
        conversationView.removeEventListener('transitionend', trWait);
        ok(document.body.classList.contains('conversation'), 'Conversation displayed');
        ok(contactField.value.length == 0, 'To: field empty');

        contactField.value = '123';
        textField.value = 'Hello world.';
        EventUtils.sendMouseEvent({type: 'mousedown'}, sendButton);

        waitFor(function() {
          var messageCount = document.querySelectorAll('#msg-conversation-view-list > div').length;
          ok((messageCount == 1), 'Message added');

          windowManager.closeForegroundWindow();
        }, function() {
          let messageCount = document.querySelectorAll('#msg-conversation-view-list > div').length;
          return messageCount == 1;
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
