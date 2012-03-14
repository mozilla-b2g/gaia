function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    var testContact;
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;

      // creating a contact
      testContact = new mozContact();
      testContact.init({
        givenName: 'Kennedy',
        familyName: 'Cooley',
        name: 'Kennedy Cooley',
      });

      var req = navigator.mozContacts.save(testContact);
      req.onsuccess = function() {

        var contactTab = dialerWindow.document.getElementById('contacts-label');
        EventUtils.sendMouseEvent({type: 'click'}, contactTab);

        waitFor(function() {
          var contactsView = dialerWindow.document.getElementById('contacts-view');
          var displayedContacts = contactsView.querySelectorAll('.contact');
          var contactElement = null;
          for (var i = 0; i < displayedContacts.length; i++) {
            if (displayedContacts[i].textContent == 'Kennedy Cooley') {
              contactElement = displayedContacts[i];
              break;
            }
          }

          ok(contactElement != null, 'Test contact displayed at first');

          var searchField = dialerWindow.document.getElementById('contacts-search');

          // opening the keyboard
          searchField.focus();
          dialerWindow.addEventListener('resize', function afterResize() {
            dialerWindow.removeEventListener('resize', afterResize);

            EventUtils.sendString('aaarg');
            ok(contactElement.hidden, 'Test contact hidden when no match');

            searchField.value = '';
            EventUtils.sendString('coo');
            ok(!contactElement.hidden, 'Test contact displayed when matching on family name');

            searchField.value = '';
            EventUtils.sendString('enn');
            ok(!contactElement.hidden, 'Test contact displayed when matching on given name');

            // closing the keyboard
            EventUtils.sendKey('ESCAPE', dialerWindow);

            dialerWindow.addEventListener('resize', function afterResize() {
              dialerWindow.removeEventListener('resize', afterResize);

              windowManager.closeForegroundWindow();
            });
          });
        }, function() {
          return (('Contacts' in dialerWindow) && dialerWindow.Contacts._loaded);
        });
      };
    }

    function onClose() {
      navigator.mozContacts.remove(testContact);
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
