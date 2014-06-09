// Aqui hablamos con jsDAVLib

'use strict';

var DAVLib = function DAVLib() {

  var openedDAVConnection = null;
  var openedDAVMainResource = null;
  var datastore = null;

  var initLogin = function initLogin(ds, accountData, cb) {
    datastore = ds;
    openedDAVConnection = jsDAVlib.getConnection(accountData);
    openedDAVConnection.onready = function() {
      console.log('connectionInfo: ' +
        JSON.stringify(openedDAVConnection.getInfo()));
      openedDAVConnection.getResource(null, function(res, error) {
        if (error) {
          console.log('Error getting main resource - ' + error);
          return;
        }

        openedDAVMainResource = res;
        if (typeof cb === 'function') {
          cb();
        }
      });
    }
  };

  var getContacts = function getContacts(cb) {
    if (!openedDAVMainResource.isAddressBook() ||
        !openedDAVMainResource.isCollection() ) {
      console.log('Error, no valid CardDAV server');
      return;
    }

    var contactsList = openedDAVMainResource.get().data;
    var contactsResource = [];

    var pendingToProcess = contactsList.length;
    for (var i=0; i < contactsList.length; i++) {
      console.log(JSON.stringify(contactsList[i]));
      openedDAVConnection.getResource(contactsList[i].href, function(res, e) {
        pendingToProcess--;
        if (e) {
          console.log('Error getting resource ' + contactsList[i].href +
            ' - ' + e);
          return;
        }

        contactsResource.push(res);
        if (!pendingToProcess) {
          cb(contactsResource);
        }
      });
    }
  };

  var importContacts = function importContacts(cb) {
    this.getContacts(function(contacts) {
      console.log('Importing ' + contacts.length + ' contacts ...');
      doImportContacts(contacts, cb);
    });
  };

  function doImportContacts(contacts, cb) {
    if (!contacts || contacts.length === 0) {
      if (typeof cb === 'function') {
        cb();
      }
      return;
    }

    var contact = prepareForDS(contacts[0]);
    console.log(JSON.stringify(contact));

    function continuee() {
      var rest = contacts.slice(1);
      if (rest && rest.length > -1) {
        doImportContacts(rest, cb);
      }
    }

    datastore.add(contact).then(function(id) {
      console.add('Added contact with id ' + id);
      continuee();

    }, function() {
      console.add('Error saving contact ');
      continuee();
    });
  }

  function prepareForDS(contact) {
    // Initialy only get vcard raw data
    return contact.get();
  }

  return {
    initLogin: initLogin,
    getContacts: getContacts,
    importContacts: importContacts
  };

}();
