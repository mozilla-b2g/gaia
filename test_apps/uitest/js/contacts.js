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

  get newActivityButton() {
    delete this.newActivityButton;
    return this.newActivityButton = document.getElementById('activities-new');
  },

  get editActivityButton() {
    delete this.editActivityButton;
    return this.editActivityButton = document.getElementById('activities-edit');
  },

  get newWithDataActivityButton() {
    delete this.newWithDataActivityButton;
    return this.newWithDataActivityButton = document.getElementById('activities-new-data');
  },

  init: function ct_init() {
    this.loadButton.addEventListener('click', this.loadContacts.bind(this));
    this.clearButton.addEventListener('click', this.clearContacts.bind(this));
    this.newActivityButton.addEventListener('click',
                                            this.newActivity.bind(this));
    this.editActivityButton.addEventListener('click',
                                            this.editActivity.bind(this));
    this.newWithDataActivityButton.addEventListener('click',
                                            this.newWithDataActivity.bind(this));
  },

  uninit: function ct_uninit() {
    this.loadButton.removeEventListener('click', this.loadContacts.bind(this));
    this.clearButton.removeEventListener('click',
                                         this.clearContacts.bind(this));
    this.newActivityButton.removeEventListener('click',
                                            this.newActivity.bind(this));
    this.editActivityButton.removeEventListener('click',
                                            this.editActivity.bind(this));
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

  setContactId: function ct_setContactId(id) {
    this.contactId = id;
  },

  getContactId: function ct_getContactId() {
    return this.contactId;
  },

  newActivity: function ct_newActivity() {
    var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
        }
      });

    var self = this;
    activity.onsuccess = function() {
      var contact = this.result.contact;
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        document.getElementById('activities-result').innerHTML = 'New contact' + ' create with id: ' + contact.id;
        self.setContactId(contact.id);
        document.getElementById('activities-edit').disabled = false;
        var app = evt.target.result;
        app.launch();
      };
    };

    activity.onerror = function() {
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        document.getElementById('activities-result').innerHTML = 'Activity canceled';
        var app = evt.target.result;
        app.launch();      
      };
    };

  },

  newWithDataActivity: function ct_newActivity() {
    var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': '555-555-555',
            'email': 'cool-hunter@telefonica.es',
            'address': 'San Francisco',
            'note': 'This is a note',
            'giveName': 'John',
            'familyName': 'Orlock',
            'company': 'Lost Industries'
          }
        }
      });

    var self = this;
    activity.onsuccess = function() {
      var contact = this.result.contact;
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        document.getElementById('activities-result').innerHTML = 'New contact' + ' create with id: ' + contact.id;
        self.setContactId(contact.id);
        document.getElementById('activities-edit').disabled = false;
        var app = evt.target.result;
        app.launch();
      };
    };

    activity.onerror = function() {
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        document.getElementById('activities-result').innerHTML = 'Activity canceled';
        var app = evt.target.result;
        app.launch();      
      };
    };

  },

  editActivity: function ct_editActivity() {
    var activity = new MozActivity({
        name: 'edit',
        data: {
          type: 'webcontacts/contact',
          contactId: this.getContactId()
        }
      });

      activity.onsuccess = function() {
        var contact = this.result.contact;
        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {        
          document.getElementById('activities-result').innerHTML = 'Finished editing new contact';
          var app = evt.target.result;
          app.launch();
        };
      };

      activity.onerror = function() {
        navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
          document.getElementById('activities-result').innerHTML = 'Activity canceled';
          var app = evt.target.result;
          app.launch();      
        };
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

  _insertContacts: function ct_insertContacts(aContacts, aCurrent) {
    if (!aCurrent)
      aCurrent = 0;

    this._setInsertionCount(aCurrent, aContacts.length);

    // Base case - we've reached the end of the contacts list.
    if (aCurrent >= aContacts.length) {
      this.loadButton.disabled = false;
      return;
    }

    var contact = new mozContact();
    var contactData = aContacts[aCurrent];
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

window.addEventListener('load', ContactsTest.init.bind(ContactsTest));
window.addEventListener('unload', ContactsTest.uninit.bind(ContactsTest));
