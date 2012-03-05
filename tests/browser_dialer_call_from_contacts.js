
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;

      var keyboardTab = dialerWindow.document.getElementById('keyboard-label');
      EventUtils.sendMouseEvent({type: 'click'}, keyboardTab);

      var contactTab = dialerWindow.document.getElementById('contacts-label');
      EventUtils.sendMouseEvent({type: 'click'}, contactTab);

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');

      waitFor(function() {
        var listId = 'contacts-container';
        var contactsList = dialerWindow.document.getElementById(listId);
        var aContact = contactsList.querySelector('.contact');
        EventUtils.sendMouseEvent({type: 'click'}, aContact);

        var overlay = dialerWindow.document.getElementById('contacts-overlay');
        ok(overlay.classList.contains('displayed'), 'Overlay view displayed');

        var number = overlay.querySelector('#contact-phones div');
        var callScreen = dialerWindow.document.getElementById('call-screen');

        EventUtils.sendMouseEvent({type: 'click'}, number);
        callScreen.addEventListener('transitionend', function trWait() {
          callScreen.removeEventListener('transitionend', trWait);
          ok(callScreen.classList.contains('oncall'), 'Call screen displayed');

          windowManager.closeForegroundWindow();
        });
      }, function() {
        return (('Contacts' in dialerWindow) && dialerWindow.Contacts._loaded);
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
