
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getWindowManager(function(windowManager) {
    function onReady(smsFrame) {
      let document = smsFrame.contentWindow.document;

      var conversationView = document.getElementById('msg-conversation-view');
      var contactField = document.getElementById('msg-conversation-view-num');

      var aConv = document.querySelector("#msg-conversations-list > div[data-notempty='true']");
      EventUtils.sendMouseEvent({type: 'click'}, aConv);

      conversationView.addEventListener('transitionend', function trWait() {
        conversationView.removeEventListener('transitionend', trWait);
        ok(document.body.classList.contains('conversation'), 'Conversation displayed');
        ok(contactField.value.length != 0, 'To: field filled');

        // closing the conversation view
        EventUtils.sendKey('ESCAPE', smsFrame.contentWindow);
        conversationView.addEventListener('transitionend', function trWait() {
          conversationView.removeEventListener('transitionend', trWait);
          ok(!document.body.classList.contains('conversation'), 'Conversation hidden');

          setTimeout(function() {
            windowManager.closeForegroundWindow();
          }, 0);
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
