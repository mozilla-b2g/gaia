/* global Promise, SimplePhoneMatcher */
/* exported GlobalMergedContacts */

'use strict';

/**
 * Global Contacts Datastore API
 */

/**
 * Each entry in the Global Datastore will contain a sequence of
 * `GlobalDSEntry` objects.
 *
 * @typedef GlobalDSEntry
 * @type {object}
 * @property {string} uid - ID that the contact has in its original DataStore
 * @property {string} origin - Original DataStore name
*/

var GlobalMergedContacts = (function _GlobalMergedContacts() {
  const NAME = 'Global_Contacts_Datastore';

  /** Promise for the GCDS */
  const globalDSPromise =
    navigator.getDataStores(NAME).then(stores => stores[0]);

  /**
   * Creates an empty Index object that will contain different references that
   * point back to the original contact
   *
   * @return {Object} An empty Index Object
   */
  function createIndex() {
    return {
      // By tel number and all its possible variants
      // (We are not supporting dups right now)
      byTel: Object.create(null),
      // Prefix tree to enable search by partial tel numbers
      treeTel: [],
      // Contains all the indexes of contacts that come from a
      // specific store, indexed by contact uid
      byStore: Object.create(null)
    };
  }

  // Returns -1 if not mergeable by phone number or the GlobalDatastoreId that
  // should be added to.
  function getEntryIdToMerge(contact) {
    if (!Array.isArray(contact.tel) || contact.tel.length === 0) {
      return -1;
    }

    let phones = contact.tel.filter(phone => !!phone.value);
    for (let phone of phones) {
      let variants = SimplePhoneMatcher.generateVariants(phone);
      for (let variant of variants) {
        if (index.ByTel[variant]) {
          return index.ByTel[variant];
        }
      }
    }

    return -1;
  }

  /**
   * Adds a new contact to the global DataStore
   * @param {DataStore} originalStore is the Store origin
   * @param {} originalStoreId is the object id in the original data store
   * @param {MozContact} contact Contact to add to the GCDS
   *
   * @return {Promise}
   */
  function add(originalStore, originalStoreId, contact) {
    let globalDsId = getEntryIdToMerge(contact);

    /** @type GlobalDSEntry */
    let entry = {
      uid: originalStoreId,
      origin: originalStore.owner
    };

    return globalDSPromise.then(globalStore => {
      if (globalDsId !== -1) { // Contact exists
        // Append a contact to an specific index
        return globalStore.get(globalDsId).then(obj => {
          obj.push(entry);
          return globalStore.put(obj, globalDsId);
        });
      }

      // Adds a new contact.
      return globalStore.add([entry]);
    }).then(globalDsId => reIndex(entry, originStore, globalDsId, contact));
  }

  function reIndex(entry, originStore, globalDsId, contact) {
    indexByPhone(contact, globalDsId);
    indexByStore(originStore, entry.uid, globalDsId);
    isIndexDirty = true;

    return entry;
  }

  // Get a list of all contacts by this DS and perform
  // remove operations over it.
  function clear(originStore) {
    if (!index) {
      return Promise.reject();
    }

    let byStore = index.byStore[originStore.owner];
    if (!byStore) {
      return Promise.resolve();
    }

    return Promise.all(
      Object.keys(byStore).map(key => remove(originStore, key)));
  }

  /**
   * Remove contact from Global Contacts DataStore
   *
   * @param {DataStore} originStore Original datastore containing contact
   * @param {String} originDsId Id of the contact to delete
   * @param {MozContact} contact Contact to delete
   *
   * @return {Promise}
   */
  function remove(originStore, originDsId, contact) {
    let globalDsId = index.byStore[originStore.owner][originDsId];
    if (!globalDsId) {
      return Promise.resolve();
    }

    return globalDSPromise
      .then(globalStore => globalStore.get(globalDsId))
      .then(entries => {
        if (!Array.isArray(entries)) {
          return Promise.reject(new Error('An array of entries was expected'));
        }

        return doRemove(entries, originStore, originDsId, globalDsId, contact);
      });
  }

  /**
   * Remove one component from a contact. We have two cases, a contact
   * with a single component (direct), or a contact that is compound
   * by several entries
   *
   * @param {Array} entries Array of objects containing the components of a contact
   * @param {DataStore} originStore Source datastore for the component we want remove
   * @param {String} originDsId index of the global merged contact
   * @param {String} globalDsId index of the contact in the origin datastore
   */
  function doRemove(entries, originStore, originDsId, globalDsId, contact) {
    entries = entries.filter(entry => {
      entry.origin !== originStore.owner && entry.uid !== originDsId;
    });

    // Remove indexes
    // TODO: Remove indexes by phone
    let storeIndex = index.byStore[originStore.owner];
    delete storeIndex[originDsId];
    if (Object.keys(storeIndex).length === 0) {
      delete index.byStore[originStore.owner];
    }
    if (contact) {
      _removePhoneIndex(contact);
    }

    // Update entry
    isIndexDirty = true;
    return globalDSPromise.then(globalStore => {
      if (entries.length === 0) {
        return globalStore.remove(globalDsId);
      }

      return globalStore.put(entries, globalDsId);
    });
  }

  function _removePhoneIndex(deletedContact) {
    // Need to update phone indexes
    if (!Array.isArray(deletedContact.tel)) {
      return;
    }

    deletedContact.tel.forEach(phone => {
      TelIndexer.remove(index.treeTel, phone.value.substring(1));

      SimplePhoneMatcher
        .generateVariants(phone.value)
        .forEach(variant => delete index.byTel[variant]);
    });
  }

  return { init, add, remove, clear };
})();
