
function test() {
  appTest(function(appManager) {
    var smsFrame = appManager.launch('../sms/sms.html');
    waitFor(function() {
      let document = smsFrame.contentWindow.document;

      var convCount = document.getElementById('messages').children.length;

      var newButton = document.querySelector(".message[data-num='*']");
      EventUtils.sendMouseEvent({type: 'click'}, newButton);

      var conversationView = document.getElementById('conversationView');
      var contactField = document.getElementById('contact');
      var textField = document.getElementById('text');
      var sendButton = document.getElementById('send');

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
        finish();
      }, function() {
        return (document.getElementById('messages').children.length ==
                (convCount + 1));
      });

    }, function() {
      let smsWindow = smsFrame.contentWindow;
      return 'MessageView' in smsWindow;
    });
  });
}
