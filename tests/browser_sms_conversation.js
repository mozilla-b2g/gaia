
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getApplicationManager(function(launcher) {
    function onReady(smsFrame) {
      let document = smsFrame.contentWindow.document;

      var conversationView = document.getElementById('conversationView');
      var contactField = document.getElementById('contact');

      var aConv = document.querySelector(".message:not([data-num='*'])");
      EventUtils.sendMouseEvent({type: 'click'}, aConv);

      conversationView.addEventListener('transitionend', function trWait() {
        conversationView.removeEventListener('transitionend', trWait);
        ok(!conversationView.hidden, 'Conversation displayed');
        ok(contactField.value.length != 0, 'To: field filled');

        // closing the conversation view
        EventUtils.sendKey('ESCAPE', smsFrame.contentWindow);
        conversationView.addEventListener('transitionend', function trWait() {
          conversationView.removeEventListener('transitionend', trWait);
          ok(conversationView.hidden, 'Conversation hidden');

          launcher.close();
        });
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
