
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
      EventUtils.sendMouseEvent({type: 'click'}, newButton);

      conversationView.addEventListener('transitionend', function trWait() {
        conversationView.removeEventListener('transitionend', trWait);
        ok(!conversationView.hidden, 'Conversation displayed');
        ok(contactField.value.length == 0, 'To: field empty');

        contactField.value = '123';
        textField.value = 'Hello world.';
        EventUtils.sendMouseEvent({type: 'click'}, sendButton);

        var throbber = document.getElementById('throbber');
        ok(!throbber.hidden, 'Throbber displayed');

        waitFor(function() {
          ok(throbber.hidden, 'Throbber hidden');
          ok(conversationView.hidden, 'Conversation hidden');

          windowManager.closeForegroundWindow();
        }, function() {
          return (document.getElementById('messages').children.length ==
                  (convCount + 1));
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
