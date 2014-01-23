'use strict';

var FdnAuthorizedNumbers = {
  fdnContacts: null,

  getContacts: function(er, cb) {
    if (!IccHelper) {
      return;
    }
    var request = IccHelper.readContacts('fdn');
    request.onerror = er;
    request.onsuccess = (function onsuccess() {
      var result = this.fdnContacts = request.result;
      if (typeof cb !== 'function') {
        return;
      }
      var contacts = [];
      for (var i = 0, l = result.length; i < l; i++) {
        contacts.push({
          id: i,
          name: result[i].name || '',
          number: result[i].tel[0].value || ''
        });
      }
      cb(contacts);
    }).bind(this);
  },

  /**
   * mozIccManager.updateContact works like this:
   *   - no id: create a new contact
   *   - existing id + name and number: update a contact
   *   - existing id + empty name and number: remove a contact
   * This function returns an FDN contact object matching the requested action.
   */
  getContactInfo: function(action, contact) {
    var simContact = {};
    switch (action) {
      case 'add':
        simContact.name = [contact.name];
        simContact.tel = [{ value: contact.number }];
        break;
      case 'edit':
        simContact = this.fdnContacts[contact.id];
        simContact.name[0] = contact.name;
        simContact.tel[0].value = contact.number;
        break;
      case 'remove':
        simContact = this.fdnContacts[contact.id];
        simContact.name[0] = '';
        simContact.tel[0].value = '';
        break;
    }
    return simContact;
  }
};

