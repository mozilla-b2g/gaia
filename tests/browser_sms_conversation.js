
function test() {
  SimpleTest.__appTestFinished = false;

  appTest('../sms/sms.html', function(smsFrame) {
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

            SimpleTest.__appTestFinished = true;
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
