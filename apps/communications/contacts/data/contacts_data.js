'use strict';

/* exported ContactsData */
/* globals Promise, LazyLoader, SimplePhoneMatcher, Normalizer, IDBKeyRange */

// ATTENTION: This library lazy loads '/shared/js/simple_phone_matcher.js'

var ContactsData = (function() {
  const DB_NAME = 'Local_Contacts_Database';
  const DB_VERSION = 1.0;
  const STORE_NAME = 'LocalContacts';

  const INDEX_BY_NAME = 'by_name';
  const INDEX_BY_GN = 'by_givenName';
  const INDEX_BY_FN = 'by_familyName';

  const INDEX_BY_TEL = 'by_tel';
  const INDEX_BY_EMAIL = 'by_email';
  const INDEX_BY_MULTI_CONTACT = 'by_multi_contact';

  function createSchema(db) {
    if (db.objectStoreNames.contains(STORE_NAME)) {
      db.deleteObjectStore(STORE_NAME);
    }

    var store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

    // Indexes over (_<field>) are for indexing
    // the normalized representation of <field>

    store.createIndex(INDEX_BY_NAME, '_name', {
      unique: false
    });

    store.createIndex(INDEX_BY_GN, '_givenName', {
      unique: false
    });

    store.createIndex(INDEX_BY_FN, '_familyName', {
      unique: false
    });

    store.createIndex(INDEX_BY_TEL, '_tel', {
      unique: false,
      multiEntry: true
    });

    store.createIndex(INDEX_BY_EMAIL, '_email', {
      unique: false,
      multiEntry: true
    });

    store.createIndex(INDEX_BY_MULTI_CONTACT, 'multiContactId', {
      unique: true
    });
  }

  var Database = new Promise((resolve, reject) => {
    var req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => createSchema(e.target.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('Error getting Database: ', req.error && req.error.name);
      reject(req.error);
    };
  });

  function normalizeName(str) {
    if (!str || !str.trim()) {
      return '';
    }

    return Normalizer.toAscii(str.trim().toLowerCase());
  }

  // Returns the field name of the normalized representation of a field
  function normalizedFieldName(fieldName) {
    return '_' + fieldName;
  }

  // Returns the value of the normalized representation of a field
  function normalizedField(fieldName, contact) {
    return contact[normalizedFieldName(fieldName)];
  }

  // Sets a value for the normalized representation of a field
  function setNormalizedFieldValue(fieldName, contact, value) {
    contact[normalizedFieldName(fieldName)] = value;
  }

  // Normalize the contact data in order to make it searchable
  function normalizeData(contact) {
    return new Promise(function(resolve, reject) {
      LazyLoader.load('/shared/js/simple_phone_matcher.js', function() {
        var nameFields = ['name', 'givenName', 'familyName'];
        var valueTypeFields = ['email', 'tel'];

        nameFields.forEach(function(aField) {
          var value = Array.isArray(contact[aField]) && contact[aField][0];
          setNormalizedFieldValue(aField, contact, normalizeName(value));
        });

        valueTypeFields.forEach(function(aField) {
          if (!Array.isArray(contact[aField])) {
            return;
          }

          setNormalizedFieldValue(aField, contact, []);

          contact[aField].forEach(function(fieldData) {
            if (fieldData && fieldData.value) {
              if (aField === 'tel') {
                var variants = SimplePhoneMatcher.
                  generateVariants(fieldData.value);
                variants.forEach(function(aVariant) {
                  normalizedField(aField, contact).push(aVariant);
                });
              }
              else {
                normalizedField(aField, contact).push(fieldData.value);
              }
            }
          });
        });

        resolve(contact);
      });
    });
  }

  function requestStore(db, accessMode) {
    var transaction = db.transaction([STORE_NAME], accessMode);
    var objectStore = transaction.objectStore(STORE_NAME);

    return objectStore;
  }

  function save(aContact) {
    return new Promise((resolve, reject) => {
      Database.then(function(db) {
        var objectStore = requestStore(db, 'readwrite');

        normalizeData(aContact).then(contact => {
          var req = objectStore.put(contact);

          req.onsuccess = () => resolve(aContact.id);
          req.onerror = () => {
            console.error(
              'Error saving contact: ', contact.id, req.error && req.error.name);
              reject(req.error);
          };
        });
      });
    });
  }

  function get(id) {
    return new Promise((resolve, reject) => {
      Database.then(function(db) {
        var objectStore = requestStore(db, 'readonly');
        var req = objectStore.get(id);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.error(
            'Error getting contact: ', id, req.error && req.error.name);
            reject(req.error);
        };
      });
    });
  }

  // This function allows to retrieve a record from the DB by <multiContactId>
  // <multiContactId> is the id of the corresponding record
  // in the GlobalContactsDatastore
  // This is needed as the id of the record in the DB could or could not be
  // the same as the id in the GlobalContactDatastore.
  function getMultiContact(multiContactId) {
    return new Promise((resolve, reject) => {
      Database.then(function(db) {
        var objectStore = requestStore(db, 'readonly');
        var index = objectStore.index(INDEX_BY_MULTI_CONTACT);

        var req = index.get(multiContactId);
        req.onsuccess = () => resolve(req.result);

        req.onerror = () => {
          console.error('Error while getting by multicontact: ', multiContactId,
                        req.error && req.error.name);
          reject(req.error);
        };
      });
    });
  }

  function remove(id) {
    return new Promise((resolve, reject) => {
      Database.then(function(db) {
        var objectStore = requestStore(db, 'readwrite');
        var req = objectStore.delete(id);

        req.onsuccess = () => resolve(id);
        req.onerror = () => {
          console.error('Error removing: ', id, req.error && req.error.name);
          reject(req.error);
        };
      });
    });
  }

  function clear() {
    return new Promise((resolve, reject) => {
      Database.then(function(db) {
        var objectStore = requestStore(db, 'readwrite');
        var req = objectStore.clear();

        req.onsuccess = resolve;
        req.onerror = () => {
          console.error('Error clearing DB: ', req.error && req.error.name);
          reject(req.error);
        };
      });
    });
  }

  function findBy(field, strToFind) {
    if (!field || !strToFind || !field.trim() || !strToFind.trim()) {
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      Database.then(function(db) {
        var objectStore = requestStore(db, 'readonly');
        var indexName = 'by' + '_' + field;
        var index = objectStore.index(indexName);

        if (field === 'name' || field === 'givenName' ||
            field === 'familyName') {
          strToFind = normalizeName(strToFind);
        }

        var req = index.openCursor(IDBKeyRange.only(strToFind));
        var resultArray = [];
        req.onsuccess = () => {
          var cursor = req.result;
          if (cursor) {
            // Called for each matching record.
            resultArray.push(cursor.value);
            cursor.continue();
          } else {
            resolve(resultArray);
          }
        };
        req.onerror = () => {
          console.error('Error finding data: ', req.error && req.error.name);
          resolve([]);
        };
      });
    });
  }

  // Returns a cursor that allows to iterate over all contacts stored
  function getAll(args) {
    return new Cursor();
  }

  function Cursor() {
    var self = this;

    Object.defineProperty(this, 'onsuccess', {
      set: function(callback) {
        Database.then(function(db) {
          var objectStore = requestStore(db, 'readonly');
          self.idbIndex = objectStore.index(INDEX_BY_NAME);

          var req = self.idbIndex.openCursor();
          req.onsuccess = function(evt) {
            self.cursor = evt.target.result;
            if (typeof callback === 'function') {
              callback({
                target: {
                  result: self.cursor && self.cursor.value
                }
              });
            }
          };
          req.onerror = function() {
            console.error('Error while opening cursor: ', req.error.name);
            typeof self.onerror === 'function' && self.onerror();
          };
        }, function error(err) {
          typeof self.onerror === 'function' && self.onerror();
        });
      }
    });

    this.continue = function() {
      this.cursor.continue();
    };
  }

  return {
    get,
    getMultiContact,
    save,
    remove,
    clear,
    getAll,
    findBy
  };
})();
