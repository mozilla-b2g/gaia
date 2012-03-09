
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;

      var contactTab = dialerWindow.document.getElementById('contacts-label');
      EventUtils.sendMouseEvent({type: 'click'}, contactTab);

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');

      waitFor(function() {
        // creating a contact
        var addButton = dialerWindow.document.getElementById('contact-add');
        EventUtils.sendMouseEvent({type: 'click'}, addButton);

        var details = dialerWindow.ContactDetails;
        var overlay = details.overlay;

        overlay.addEventListener('transitionend', function trWait() {
          overlay.removeEventListener('transitionend', trWait);

          var testNumber = '321-123-4242';

          details.contactGivenNameField.value = 'John';
          details.contactFamilyNameField.value = 'Appleseed';
          details.contactPhoneField.value = testNumber;
          details.contactEmailField.value = 'john@appleseed.com';

          var submitButton = details.view.querySelector('input[type="submit"]');
          EventUtils.sendMouseEvent({type: 'click'}, submitButton);

          waitFor(function() {
            EventUtils.sendKey('ESCAPE', dialerWindow);

            overlay.addEventListener('transitionend', function trWait() {
              overlay.removeEventListener('transitionend', trWait);

              dialerWindow.Contacts.findByNumber(testNumber, function(contact) {
                var contactId = contact.id;
                var entry = dialerWindow.document.getElementById(contactId);
                ok(entry != null, 'Entry for the contact created');

                // editing the contact
                EventUtils.sendMouseEvent({type: 'click'}, entry);

                overlay.addEventListener('transitionend', function trWait() {
                  overlay.removeEventListener('transitionend', trWait);

                  var editSelector = 'button[data-action="edit"]';
                  var editButton = details.view.querySelector(editSelector);
                  EventUtils.sendMouseEvent({type: 'click'}, editButton);

                  ok(details.view.classList.contains('editing'),
                     'In editing mode');

                  var newNumber = '0112345678';
                  details.contactPhoneField.value = newNumber;
                  EventUtils.sendMouseEvent({type: 'click'}, submitButton);
                  waitFor(function() {
                    EventUtils.sendKey('ESCAPE', dialerWindow);

                    overlay.addEventListener('transitionend', function tWait() {
                      overlay.removeEventListener('transitionend', tWait);

                      dialerWindow.Contacts.findByNumber(newNumber,
                      function(contact) {
                        ok(contact.id == contactId, 'Contact has been updated');

                        windowManager.closeForegroundWindow();
                      });
                    });
                  }, function() {
                    return !(details.view.classList.contains('editing'));
                  });
                });
              });
            });
          }, function() {
            return !(details.view.classList.contains('editing'));
          });
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
