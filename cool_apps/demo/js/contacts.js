'use stricts';

/**
 * Just a couple of testing tools for the Contacts app.
 *
 * Right now, it just allows you to insert a large number of fake contacts
 * into the database, and then clear the database.
 */

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
    this.loadButton.addEventListener('click', this.loadContacts.bind(this));
    this.clearButton.addEventListener('click', this.clearContacts.bind(this));
  },

  uninit: function ct_uninit() {
    this.loadButton.removeEventListener('click', this.loadContacts.bind(this));
    this.clearButton.removeEventListener('click',
                                         this.clearContacts.bind(this));
  },

  clearContacts: function ct_clearContacts() {

    // Ok, we're really doing this.
    var req = window.navigator.mozContacts.clear();
    req.onsuccess = function() {
      alert('Contacts deleted.');
    };
    req.onerror = function() {
      alert('Problem deleting contacts');
    };
  },

  loadContacts: function ct_loadContacts() {
    var req = new XMLHttpRequest();
    req.overrideMimeType('application/json');
    req.open('GET', '../data/fakecontacts/fakecontacts.json', true);
    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status === 200) {
        var contacts = JSON.parse(req.responseText);
        this._insertContacts(contacts);
      }
    }.bind(this);

    this.loadButton.disabled = true;
    req.send(null);
  },

  _insertContacts: function ct_insertContacts(aContacts, aCurrent) {
    if (!aCurrent)
      aCurrent = 0;

    this._setInsertionCount(aCurrent, aContacts.length);

    // Base case - we've reached the end of the contacts list.
    if (aCurrent >= aContacts.length) {
      this.loadButton.disabled = false;
      return;
    }
    var contactData = aContacts[aCurrent];
    if (contactData.photo) {
      var img = document.createElement('img');
      var currentImg = contactData.photo[0];
      img.src = '../data/images/' + currentImg;
      var dataImg;
      this.img = img;
      img.onload = function() {
        dataImg = getContactImg(this.img);
        contactData.photo[0] = dataImg;
        this._doSaveContact(aContacts, aCurrent, contactData);
      }.bind(this);
    } else {
      this._doSaveContact(aContacts, aCurrent, contactData);
    }
  },

  _doSaveContact: function ct_doSaveContact(aContacts, aCurrent, contactData) {
    var contact = new mozContact();
    contact.init(contactData);

    var req = navigator.mozContacts.save(contact);

        // Use some recursion here to add the next contact when this one
        // is done being inserted.
        req.onsuccess = function() {
          this._insertContacts(aContacts, aCurrent + 1);
        }.bind(this);

        req.onerror = function() {
          Components.utils.reportError('Could not add contact with name: ' +
                                       contactData.familyName[0]);
        }
  },

  _setInsertionCount: function ct__setInsertionCount(aSoFar, aTotal) {
    var insertionEl = document.getElementById('insertion-count');
    insertionEl.textContent = aSoFar + ' / ' + aTotal;
  }
};

function getContactImg(contactImg) {
  // Checking whether the image was actually loaded or not
  var canvas = document.createElement('canvas');
  canvas.width = contactImg.width;
  canvas.height = contactImg.height;
  canvas.getContext('2d').drawImage(contactImg, 0, 0);
  var ret = canvas.toDataURL();
  contactImg = null;
  canvas = null;
  return ret;
}

window.addEventListener('load', ContactsTest.init.bind(ContactsTest));
window.addEventListener('unload', ContactsTest.uninit.bind(ContactsTest));
