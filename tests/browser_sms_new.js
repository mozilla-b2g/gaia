
function test() {
  SimpleTest.__appTestFinished = false;

  appTest('../sms/sms.html', function(smsFrame) {
    waitFor(function() {
      let document = smsFrame.contentWindow.document;

      waitFor(function() {
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

            SimpleTest.__appTestFinished = true;
          }, function() {
            return (document.getElementById('messages').children.length ==
                    (convCount + 1));
          });
        });
      }, function() {
        let newButton = document.querySelector(".message[data-num='*']");
        return (newButton != null);
      });
    }, function() {
      let smsWindow = smsFrame.contentWindow;
      return 'MessageView' in smsWindow;
    });
  });
}
