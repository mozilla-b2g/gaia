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

  get getButton() {
    delete this.getButton;
    return this.getButton = document.getElementById('get-contacts');
  },

  get pickActivityButton() {
    delete this.pickActivityButton;
    return this.pickActivityButton = document.getElementById('activities-pick');
  },

  get newActivityButton() {
    delete this.newActivityButton;
    return this.newActivityButton = document.getElementById('activities-new');
  },

  get newWithDataActivityButton() {
    delete this.newWithDataActivityButton;
    return this.newWithDataActivityButton =
                          document.getElementById('activities-new-data');
  },

  get insertSocialContacts() {
    delete this.insertSocialContacts;
    return this.insertSocialContacts =
                        document.getElementById('insert-social-contacts');
  },


  init: function ct_init() {
    this.loadButton.addEventListener('click', this.loadContacts.bind(this));
    this.clearButton.addEventListener('click', this.clearContacts.bind(this));
    this.getButton.addEventListener('click', this.getContacts.bind(this));
    this.pickActivityButton.addEventListener('click',
                                            this.pickActivity.bind(this));
    this.newActivityButton.addEventListener('click',
                                            this.newActivity.bind(this));

    this.newWithDataActivityButton.addEventListener('click',
                                        this.newWithDataActivity.bind(this));

    this.insertSocialContacts.addEventListener('click',
                                        this.finsertSocialContacts.bind(this));
  },

  uninit: function ct_uninit() {
    this.loadButton.removeEventListener('click', this.loadContacts.bind(this));
    this.clearButton.removeEventListener('click',
                                         this.clearContacts.bind(this));
    this.getButton.removeEventListener('click', this.getContacts.bind(this));
    this.newActivityButton.removeEventListener('click',
                                            this.newActivity.bind(this));
  },

  clearContacts: function ct_clearContacts() {
    if (!confirm('This will wipe out ALL of the contacts in the database. ' +
                 'Are you sure?'))
      return;

    // Ok, we're really doing this.
    var req = window.navigator.mozContacts.clear();
    req.onsuccess = function() {
      alert('Contacts deleted.');
    };
    req.onerror = function() {
      alert('Problem deleting contacts');
    };
  },

  getContacts: function ct_getContacts() {
    var options = {
      sortBy: 'familyName',
      sortOrder: 'ascending'
    };
    var start = new Date();
    var req = window.navigator.mozContacts.find(options);
    req.onsuccess = function() {
      var duration = new Date() - start;
      alert('Contacts received: ' + duration + 'msec');
    };
    req.onerror = function() {
      alert('Problem receiving contacts');
    };
  },

  setContactId: function ct_setContactId(id) {
    this.contactId = id;
  },

  getContactId: function ct_getContactId() {
    return this.contactId;
  },

  pickActivity: function ct_pickActivity() {
    var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'webcontacts/number'
        }
      });

    var self = this;
    activity.onsuccess = function() {
      var number = this.result.number;
      document.getElementById('activities-result').innerHTML =
        'Picked contact with number: ' + number;
    };

    activity.onerror = function() {
      document.getElementById('activities-result').innerHTML =
                                                        'Activity canceled';
    };
  },

  newActivity: function ct_newActivity() {
    var activity = new MozActivity({
        name: 'add-contact'
      });

    var self = this;
    activity.onsuccess = function() {
      var contact = this.result.contact;
      document.getElementById('activities-result').innerHTML =
        'New contact' + ' create with id: ' + contact.id;
      self.setContactId(contact.id);
    };

    activity.onerror = function() {
      document.getElementById('activities-result').innerHTML =
        'Activity canceled';
    };
  },

  newWithDataActivity: function ct_newActivity() {
    var activity = new MozActivity({
        name: 'add-contact',
        data: {
          tel: '555-555-555',
          email: 'cool-hunter@telefonica.es',
          address: 'San Francisco',
          note: 'This is a note',
          givenName: 'John',
          familyName: 'Orlock',
          company: 'Lost Industries'
        }
      });

    var self = this;
    activity.onsuccess = function() {
      var contact = this.result.contact;
      document.getElementById('activities-result').innerHTML =
        'New contact' + ' create with id: ' + contact.id;
      self.setContactId(contact.id);
    };

    activity.onerror = function() {
      document.getElementById('activities-result').innerHTML =
        'Activity canceled';
    };
  },

  loadContacts: function ct_loadContacts() {
    var req = new XMLHttpRequest();
    req.overrideMimeType('application/json');
    req.open('GET', '../data/fakecontacts/fakecontacts.json', true);
    req.onreadystatechange = function() {
      // We will get a 0 status if the app is in app://
      if (req.readyState === 4 && (req.status === 200 ||
                                   req.status === 0)) {
        var contacts = JSON.parse(req.responseText);
        this._insertContacts(contacts);
      }
    }.bind(this);

    this.loadButton.disabled = true;
    req.send(null);
  },

  _insertContacts: function ct_insertContacts(aContacts) {
    var self = this;

    var cs = new ContactsSaver(aContacts);
    cs.start();

    cs.onsuccess = function() {
      self.loadButton.disabled = false;
    }
    cs.onsaved = function(n) {
      self._setInsertionCount(n, aContacts.length);
    }
    cs.onerror = function(c, e) {
      Components.utils.reportError('Could not add contact with name: ' +
                                   c.familyName[0]);
    }
  },

  _setInsertionCount: function ct__setInsertionCount(aSoFar, aTotal) {
    var insertionEl = document.getElementById('insertion-count');
    insertionEl.textContent = aSoFar + ' / ' + aTotal;
  },

  _error: function ct__error(c) {
    Components.utils.reportError('Could not add contact with name: ' +
                                   c.familyName[0]);
  },

  finsertSocialContacts: function ct_finsertSocialContacts() {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', '../data/fakesocialcontacts/contacts_social.json', true);
    xhr.onload = function(e) {
      // We will get a 0 status if the app is in app://
      if (xhr.status === 200 || xhr.status === 0) {
        var cdata = JSON.parse(xhr.responseText);
        this._insertSocialContacts(cdata.data);
      }
    }.bind(this);

    xhr.send(null);
  },

  _insertSocialContacts: function ct__insertSocialContacts(contacts) {
    var cs = new ContactsSaver(contacts);

    cs.start();

    var self = this;

    cs.onsuccess = function() { window.alert('Added!'); }
    cs.onerror = function(e, c) {
      self._error(c);
    }
  }
};

window.addEventListener('load', ContactsTest.init.bind(ContactsTest));
window.addEventListener('unload', ContactsTest.uninit.bind(ContactsTest));
