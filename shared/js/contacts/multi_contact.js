'use strict';

/* jshint esnext:true */
/* exported MultiContact */
/* globals Promise, LazyLoader, contacts */

// ATTENTION: This library lazy-loads contacts_merger.js

var MultiContact = (function() {
  const MOZ_CONTACTS_OWNER = 'app://communications.gaiamobile.org';

  /**
   * Retrieves all datastores in 'contacts' store.
   *
   * @return {Promise<Object>}
   */
  function refreshDatastores() {
    return navigator.getDataStores('contacts').then(dsList => {
      let datastores = Object.create(null);
      dsList.forEach(ds => datastores[ds.owner] = ds);

      // This is needed because mozContact DB is not exposed as a Datastore
      // Once bug 1016838 lands this will not be needed
      datastores[MOZ_CONTACTS_OWNER] = new MozContactsDatastore();
      return datastores;
    });
  }

  /**
   * A promise that returns all datastores.
   * @type {Promise}
   */
  var datastoresPromise;

  /**
   * Finds a datastore by owner. If the store is not found at first, we refresh
   * the datastores in case a new datastore was created while we were running.
   *
   * @param {String} owner Datastore owner name
   * @return {Promise<DataStore>}
   */
  function getDatastore(origin) {
    if (!datastoresPromise) {
      datastoresPromise = refreshDatastores();
    }
    var error = new Error('Could not find DS with origin', origin);
    var getDS = datastores => datastores[origin] || Promise.reject(error);
    return datastoresPromise.then(getDS)
      .catch(() => {
        // In case a datastore has been created during this session
        datastoresPromise = refreshDatastores();
        return datastoresPromise.then(getDS);
      });
  }

  // Adapter object to obtain data from the mozContacts as if it were a DS
  // Once bug 1016838 lands this will not be needed
  function MozContactsDatastore() {}

  MozContactsDatastore.prototype = {
    get: id => {
      return new Promise((resolve, reject) => {
        let req = navigator.mozContacts.find({
          filterBy: ['id'],
          filterOp: 'equals',
          filterValue: id
        });

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          if (req.result.length > 0) {
            resolve(JSON.parse(JSON.stringify(req.result[0])));
          } else {
            resolve();
          }
        };
      });
    },
    get name() { return 'mozContacts'; }
  };

  /**
   * Returns a Promise with the merged contact information for the given GCDS
   * entry.
   *
   * @param {Object} entry Global entry for a particular contact as it is
   *                 stored in the GCDS. It should have this form:
   *                 {
   *                   id: <String>, // GCDS index.
   *                   entryData: <Array<GlobalContactInfo>>,
   *                 }
   *                 where GlobalContactInfo is the pointer to the actual
   *                 contact information stored in a DataStore owned by a
   *                 Contact Provider registered with the GCDS. This should
   *                 be an object like:
   *                 {
   *                    origin: <String>, // Origin of the Contact Provider
   *                                      // that is source of this contact
   *                                      // information.
   *                    uid: <String>, // Index of the Contact Provider's
   *                                   // DataStore for this contact.
   *                 }
   * @return {Promise<MozContact>}
   */
  function getData(entry) {
    if (!entry || !entry.id || !Array.isArray(entry.entryData)) {
      return Promise.reject(new Error('InvalidEntry'));
    }

    let mozContactId;
    // Get the contact information from each Contact Provider pointed within
    // the GCDS entry.
    let contactProviderEntries = entry.entryData
      .filter(cpEntry => !!cpEntry.origin && !!cpEntry.uid)
      .map(cpEntry => {
        let origin = cpEntry.origin;
        if (origin === MOZ_CONTACTS_OWNER) {
          mozContactId = cpEntry.uid;
        }

        return getDatastore(origin).then(store => store.get(entry.uid));
      });

    return Promise.all(contactProviderEntries).then(contacts => {
      let options = {
        targetId: entry.id,
        mozContactId: mozContactId
      };

      // The GCDS may store more than one pointer to a contact source for each
      // entry, in that case we need to do a passive merge before returning
      // the result.
      return new Promise((resolve, reject) => {
        if (contacts.length === 1) {
          contacts[0].id = options.targetId;
          return resolve(contacts[0]);
        }

        _inMemoryMerge(contacts, options, resolve, reject);
      });
    });
  }

  function _inMemoryMerge(operations, options, resolve, reject) {
    LazyLoader.load('/shared/js/contacts/contacts_merger.js', () => {
      if (options.mozContactId) {
        operations = reorderResults(operations, options.mozContactId);
      }

      let matchings = createMatchingContacts(operations);
      resolve(contacts.Merger.inMemoryMerge(operations[0], matchings)
        .then(mergedResult => {
          mergedResult.id = options.targetId;
          return mergedResult;
        }));
    });
  }

  /**
   * This function reorders the contact data results array in order to put the
   * mozContact first, as mozContact data will take precedence over other
   * datastore data
   *
   * @param {Array<DataStore>} results Array of datastores to reorder
   * @param {String} mozContactId
   *
   * @return {Array<DataStore>}
   */
  function reorderResults(results, mozContactId) {
    let out = [];

    for (let j = 0; j < results.length; j++) {
      if (results[j].id === mozContactId) {
        out.unshift(results[j]);
      } else {
        out.push(results[j]);
      }
    }

    return out;
  }

  /**
   * Adapts the result array to the input object expected by the
   * contacts_merger module
   *
   * @param {Array} results
   * @return {Array}
   */
  function createMatchingContacts(results) {
    let out = results.map(result => ({ matchingContact: result }));
    out.shift(); // Remove first element
    return out;
  }

  return { getData };
})();
