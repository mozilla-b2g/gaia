'use stricts';

var ContactsTest = {
  get button() {
    delete this.button;
    return this.button = document.getElementById('insert-contacts');
  },

  init: function ct_init() {
    log("Initing!");
    this.button.addEventListener('click', this.loadContacts.bind(this));
  },

  uninit: function ct_uninit() {
    this.button.removeEventListener('click', this.loadContacts.bind(this));
  },

  loadContacts: function ct_loadContacts() {
    var req = new XMLHttpRequest();
    req.overrideMimeType("application/json");
    req.open('GET', '../data/fakecontacts/fakecontacts.json', true);
    req.onreadystatechange = function () {
      if (req.readyState === 4 && req.status === 200) {
        var contacts = JSON.parse(req.responseText);
        this.insertContacts(contacts);
      }
    }.bind(this);

    req.send(null);
    this.button.disabled = true;
  },

  insertContacts: function ct_insertContacts(aContacts) {
    var contactsLen = aContacts.length;
    for (var i = 0; i < contactsLen; i++) {
      var contactData = aContacts[i];
      var contactName = contactData.familyName[0];
      contactData.tel = "";
      var contact = new mozContact();
      contact.init(contactData);
      var req = navigator.mozContacts.save(contact);
      req.onsuccess = (function() {
        log(contactName);
      })
      req.onerror = (function() {
        log("Nope for: " + contactName);
      })
    }
  }
};

function log(aMsg) {
  var logEl = document.getElementById('log');
  var newMsg = document.createElement('li');
  newMsg.textContent = aMsg;
  logEl.appendChild(newMsg);
}

window.onload = ContactsTest.init.bind(ContactsTest);
window.onunload = ContactsTest.uninit.bind(ContactsTest);
