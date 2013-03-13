'use strict';

Cu.import("resource://gre/modules/ContactDB.jsm");

function log(str) {
  dump('-*- Contacts generator: ' + str + '\n');
}

let uuidGen = Cc["@mozilla.org/uuid-generator;1"]
                .getService(Ci.nsIUUIDGenerator);

const CONTACTS_FILE = 'contacts.json'

let global = this;

function saveContacts(contacts){
  let idbManager = Components.classes["@mozilla.org/dom/indexeddb/manager;1"]
                                     .getService(Ci.nsIIndexedDatabaseManager);
  idbManager.initWindowless(global);

  let contactDB = new ContactDB(global);
  contactDB.init(global);

  let counter = 0;

  contacts.forEach(function save(contact) {
    let data = initContact(contact);

    contactDB.saveContact(data,
      function onSuccess() {
        counter++;
        if (counter == contacts.length - 1){
          finish = true;
        }
      },
      function onError(msg) {
        log('Error importing contacts: ' + msg);
        finish = true;
      }
    );
  });
}

function initContact(contact) {
    let newContact = {};
    newContact.properties = {
      name:            [],
      honorificPrefix: [],
      givenName:       [],
      additionalName:  [],
      familyName:      [],
      honorificSuffix: [],
      nickname:        [],
      email:           [],
      photo:           [],
      url:             [],
      category:        [],
      adr:             [],
      tel:             [],
      org:             [],
      jobTitle:        [],
      bday:            null,
      note:            [],
      impp:            [],
      anniversary:     null,
      sex:             null,
      genderIdentity:  null
    };
    for (let field in newContact.properties) {
      newContact.properties[field] = contact[field];
    }

    if (contact.id == undefined) {
      contact.id = uuidGen.generateUUID().toString();
      contact.id = contact.id.replace('-', '', 'g').replace('{', '').replace('}', '');
    }

    newContact.id = contact.id;
    newContact.published = contact.published;
    newContact.updated = contact.updated;

    return newContact;
}

let finish = true;
if (Gaia.customizeFolder &&
  getFile(Gaia.customizeFolder, CONTACTS_FILE).exists()) {
  let contactsFile = getFile(Gaia.customizeFolder, CONTACTS_FILE);
  try {
    let contacts = getJSON(contactsFile);
    log(contacts.length + ' contacts to import');

    if (contacts.length > 0) {
      finish = false;
      saveContacts(contacts);
    }
  } catch(e) {
    throw e;
  }
} else {
  log("File with default contacts not available");
}

let thread = Cc["@mozilla.org/thread-manager;1"]
               .getService().currentThread;

while (!finish) {
  thread.processNextEvent(true);
}
