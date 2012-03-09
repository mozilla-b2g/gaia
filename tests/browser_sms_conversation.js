
function test() {
  waitForExplicitFinish();
  let url = '../sms/sms.html';

  getWindowManager(function(windowManager) {
    function onReady(smsFrame) {
      let window = smsFrame.contentWindow;
      let document = window.document;
      let ConversationView = window.ConversationView;
      let ConversationListView = window.ConversationListView;

      var message = {
        'hidden': false,
        'body': 'test',
        'name': 'test',
        'num': '888',
        'timestamp': Date.now(),
        'id': parseInt(21)
      };

      var view = ConversationListView.view;
      view.innerHTML = ConversationListView.createNewConversation(message);

      var convSelector = "#msg-conversations-list > div[data-notempty='true']";
      var aConv = document.querySelector(convSelector);
      EventUtils.sendMouseEvent({type: 'click'}, aConv);

      window.addEventListener('transitionend', function trWait() {
        window.removeEventListener('transitionend', trWait);
        ok(document.body.classList.contains('conversation'),
           'Conversation displayed');

        var contactField = document.getElementById('view-num');
        ok(contactField.value.length != 0, 'To: field filled');

        setTimeout(function() {
          // closing the conversation view
          EventUtils.sendKey('ESCAPE', smsFrame.contentWindow);
          window.addEventListener('transitionend', function trWait() {
            window.removeEventListener('transitionend', trWait);
            ok(!document.body.classList.contains('conversation'),
               'Conversation hidden');

            setTimeout(function() {
              windowManager.closeForegroundWindow();
            }, 0);
          });
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
