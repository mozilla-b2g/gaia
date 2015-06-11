/* jshint esnext: true */
/* global asyncStorage, Promise, GlobalMergedContacts */
/* exported ContactsSync */
/**
 * ContactsSync manages contacts synchronization in the system. It reacts
 * to changes in different contacts datastores and applies them to the Global
 * Contacts DataStore (GCDS). In the diagram below, we can see that whenever a
 * Contacts Provider app adds or changes a contact, the GCDS will be updated
 * and itself also emit a change notifying subscribed applications (like the
 * Contacts app) that there is a new or updated aggregated contact.
 *
 *
 * +-------------------+         +-------------------+
 * | Contacts          |         | Contacts          |
 * | Provider 1        |         | Provider 2        |
 * |                   |         |                   |
 * | |idx|mozContacts| |         | |idx|mozContacts| |
 * |                   |         |                   |
 * +------------+------+         +----+--------------+
 *              |                     |
 *              |                     |
 *         +----+------+              |
 *         |           |<-------------+
 *         |   GCDS    |           +------------------------------+
 *         |           |           | Contacts app                 |
 *         |           |           |------------------------------|
 *         +-+---------+           |   Indexes       Metadata     |
 *           |                     | +--+--+--+--+-+------------+ |
 *           |     onchange        | |  |  |  |  | |            | |
 *           +---------------------+ |  |  |  |  | |            | |
 *                                 | |  |  |  |  | |            | |
 *                                 | |  |  |  |  | |            | |
 *                                 | +--+--+--+--+-+------------+ |
 *                                 |         Local IndexedDB      |
 *                                 |                              |
 *                                 +------------------------------+
 *
 * See a more complete explanation of Contact DataStore synchronization at
 * https://wiki.mozilla.org/Gaia/Contacts/Data_Refactor
 */
'use strict';

var ContactsSync = (function ContactsSync() {
  if (!navigator.getDataStores) {
    console.error('navigator.getDataStores is not available');
    return;
  }

  var stores;
  var GMC = GlobalMergedContacts;

  /**
   * Populate `stores` with all the contacts datastores and initialize the
   * Global Contacts Datastore after that.
   *
   * @return {Promise} Resolved promise with the first index in the GCDS.
   */
  function initializeStores() {
    stores = {};
    return navigator.getDataStores('contacts')
      .then(contactsStores => {
          contactsStores.forEach(store => {
            // The 'owner' property is the manifest URL of the owner app, e.g.
            // 'facebook.com'
            stores[store.owner] = store;
          });
        })
      .then(GMC.init)
      .catch (e => { console.error('Error: Can\'t initialize datastores'); });
  }

  /**
   * Finds a store given an owner and returns a promise with that store.
   *
   * @param {String} owner Owner for the requested datastore
   * @return {Promise} Promise with the store or undefined if it doesn't exist
   */
  function findStore(owner) {
    return initializeStores().then(() => stores[owner]);
  }

  function doApplyChanges(store) {
    // Since there is a bug in datastore that launch event changes in all DS of
    // the same kind, use the cursor with the revision.  Unfortunately, the
    // revisionId parameter to ask for the cursor is being ignored if it's
    // incorrect :(

    if (!store) {
      return;
    }

    // if (change.multipe) {
    //   applySync(store);
    // } else {
    //   applySingleChange(store, change);
    // }
    applySync(store);
  }

  function endSync() {
    console.log('GCDS ::: Sync done');
    window.close();
  }

  // We got a single change, apply it
  function applySingleChange(store, task) {
    console.log('---->> op ', JSON.stringify(task), store);

    var ops = ['add', 'update', 'clear', 'remove', 'done'];
    if (ops.indexOf(task.operation) === -1) {
      return Promise.reject('Operation for the task is not valid');
    }

    var taskPromise = GMC[task.operation](store, task.id, task.data);

    // In case the the operation is to be done, end Syncing.
    if (task.operation === 'done') {
      return taskPromise.then(() => setLastRevision(store, endSync));
    }

    return Promise.resolve();
  }

  function applySync(store) {
    getLastRevision(store).then(revisionId => {
      console.log('Contacts Manager :: getLastRevision :: revisionId: ',
                  revisionId);

      var cursor = store.sync(revisionId);

      // Sequentially traverse cursors and apply all the tasks
      (function resolveCursor() {
        return cursor.next().then(task => {
          applySingleChange(store, task)
            .catch(e => console.error('Error applying change: ', e))
            .then(resolveCursor);
        });
      })();
    });
  }

  // Given the current store, gets last time we
  // perform a sync. If we never did, we will get a
  // null.
  function getLastRevision(store, done) {
    return new Promise((resolve, reject) => {
      asyncStorage.getItem(store.owner, resolve);
    });
  }

  // Save current DS revision as the last one
  // we sync.
  function setLastRevision(store, done) {
    asyncStorage.setItem(store.owner, store.revisionId, function() {
      // We cannot execute the done (window.close) sequentially
      // otherwise we get the following error:
      // [JavaScript Error: "IndexedDB UnknownErr: IDBTransaction.cpp:863"]
      setTimeout(done, 1000);
    });
  }

  function onSync(evt) {
    var message = evt.data;
    console.log('On Sync invoked', JSON.stringify(message));
    return findStore(message.owner).then(doApplyChanges);
  }

  return { onSync };

})();

navigator.mozSetMessageHandler('connection', connectionRequest => {
  if (connectionRequest.keyword !== 'contacts-sync') {
    return;
  }

  console.log('Connection Request for Syncing');

  var port = connectionRequest.port;
  port.onmessage = ContactsSync.onSync;
  port.start();
});
