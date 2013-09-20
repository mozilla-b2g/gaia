'use strict';

var supportContactsCustomizer = {
  init: function sc_init() {
    var self = this;
    window.addEventListener('customization', function updateSC(event) {
      if (event.detail.setting === 'supportcontacts') {
        window.removeEventListener('customization', updateSC);
        self.setSupportContacts(event.detail.value);
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

supportContactsCustomizer.init();
