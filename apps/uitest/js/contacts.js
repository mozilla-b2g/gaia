'use stricts';

var ContactsTest = {
  get loadButton() {
    delete this.loadButton;
    return this.loadButton = document.getElementById('insert-contacts');
  },

  get clearButton() {
    delete this.clearButton;
    return this.clearButton = document.getElementById('clear-contacts');
  },

  init: function ct_init() {
    log("Initing!");
    this.loadButton.addEventListener('click', this.loadContacts.bind(this));
    this.clearButton.addEventListener('click', this.clearContacts.bind(this));
  },

  uninit: function ct_uninit() {
    this.loadButton.removeEventListener('click', this.loadContacts.bind(this));
    this.clearButton.removeEventListener('click',
                                         this.clearContacts.bind(this));
  },

  clearContacts: function ct_clearContacts() {
    if (!confirm('This will wipe out ALL of the contacts in the database. ' +
                 'Are you sure?'))
      return;

    // Ok, we're really doing this.
    var req = window.navigator.mozContacts.clear();
    req.onsuccess = function() {
      log("Contacts deleted.");
    };
    req.onerror = function() {
      log("Problem deleting contacts.");
    };
  },

  loadContacts: function ct_loadContacts() {
    var req = new XMLHttpRequest();
    req.overrideMimeType("application/json");
    req.open('GET', '../data/fakecontacts/fakecontacts.json', true);
    req.onreadystatechange = function () {
      if (req.readyState === 4 && req.status === 200) {
        var contacts = JSON.parse(req.responseText);
        this._insertContacts(contacts);
      }
    }.bind(this);

    req.send(null);
    this.loadButton.disabled = true;
  },

  _insertContacts: function ct_insertContacts(aContacts) {
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
