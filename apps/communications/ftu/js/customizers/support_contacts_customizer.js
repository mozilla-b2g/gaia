'use strict';

var SupportContactsCustomizer = (function() {
  Customizer.call(this, 'support_contacts', 'json');
  this.set = function(contacts) {
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
  };
});

var supportContactsCustomizer = new SupportContactsCustomizer();
supportContactsCustomizer.init();
