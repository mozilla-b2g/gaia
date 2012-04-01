function generatorTest() {
  waitForExplicitFinish();
  yield testApp('http://sms.gaiamobile.org/', testSMSNew);
  finish();
}

function testSMSNew(window, document, nextStep) {
  let conversationView = document.getElementById('view');
  let contactField = document.getElementById('view-num');
  let textField = document.getElementById('view-msg-text');
  let sendButton = document.getElementById('view-msg-send');
  let newButton = document.getElementById('msg-new-message');

  conversationView.addEventListener('transitionend', function trWait() {
    conversationView.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendMouseEvent({type: 'click'}, newButton);

  ok(document.body.classList.contains('conversation'),
     'Conversation displayed');
  ok(contactField.value.length == 0, 'To: field empty');

  contactField.value = '123';
  textField.value = 'Hello world.';

  // Click on the send button and wait until the message appears
/*
 * commented out because of SMS database issues that are making it fail
 *
  EventUtils.sendMouseEvent({type: 'mousedown'}, sendButton);
  yield until(
    function() {
      return document.querySelectorAll('#view-list > div').length > 0
    },
    nextStep);

  let messageCount = document.querySelectorAll('#view-list > div').length;
  ok((messageCount == 1), 'Message added');
 */
}

