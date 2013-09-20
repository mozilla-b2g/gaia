'use strict';

var SupportContactsCustomizer = {
  init: function sc_init() {
    var self = this;
    window.addEventListener('customization', function updateSC(event) {
      if (event.detail.setting === 'support_contacts') {
        window.removeEventListener('customization', updateSC);
        // Retrieve contacts from the URI provide by 'customization.json'
        var URI = event.detail.value;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', URI, true);
        xhr.overrideMimeType('application/json');
        xhr.responseType = 'json';
        xhr.onload = function() {
          if (xhr.status === 200) {
            self.setSupportContacts(xhr.response);
          } else {
            console.error('Failed to fetch file: ' + URI, xhr.statusText);
          }
        };
        try {
          xhr.send();
        } catch (e) {
          console.error('Failed to fetch file: ' + URI);
        }
      }
    });
  },

  setSupportContacts: function sc_setContacts(contacts) {
    if (contacts) {
      navigator.mozSettings.createLock().set({
        'support.onlinesupport.title': contacts.onlinesupport.title,
        'support.onlinesupport.href': contacts.onlinesupport.href,
        'support.callsupport1.title': contacts.callsupport1.title,
        'support.callsupport1.href': contacts.callsupport1.href,
        'support.callsupport2.title': contacts.callsupport2.title,
        'support.callsupport2.href': contacts.callsupport2.href
      });
    }
  }
};

SupportContactsCustomizer.init();
