
function test() {
  waitForExplicitFinish();

  appTest(function(appManager) {
    var smsFrame = appManager.launch('../sms/sms.html');
    waitFor(function() {
      let document = smsFrame.contentWindow.document;

      waitFor(function() {
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

            finish();
          });
        });
      }, function() {
        let aConv = document.querySelector(".message:not([data-num='*'])");
        return (aConv != null);
      });
    }, function() {
      let smsWindow = smsFrame.contentWindow;
      return 'MessageView' in smsWindow;
    });
  });
}
