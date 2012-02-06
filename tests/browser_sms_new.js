
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getApplicationManager(function(launcher) {
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

        launcher.close();
      });
    }

    function onClose() {
      launcher.kill(url);
      finish();
    }

    let application = launcher.launch(url);
    ApplicationObserver(application, onReady, onClose);
  });
}
