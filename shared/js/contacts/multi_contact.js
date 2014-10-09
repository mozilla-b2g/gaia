'use strict';

/* exported MultiContact */
/* globals Promise, LazyLoader, contacts */

// ATTENTION: This library lazy loads contacts_merger.js

var MultiContact = (function() {
  var datastores = Object.create(null);
  var datastoresLoading = false;
  var DS_READY_EVENT = 'ds_ready';

  var MOZ_CONTACTS_OWNER = 'app://communications.gaiamobile.org';

  function getDatastore(owner) {
    if (datastores[owner]) {
      return Promise.resolve(datastores[owner]);
    }

    return new Promise(function(resolve, reject) {
      if (datastoresLoading === true) {
        document.addEventListener(DS_READY_EVENT, function handler() {
          document.removeEventListener(DS_READY_EVENT, handler);
          resolve(datastores[owner]);
        });
      }
      else {
        datastoresLoading = true;

        navigator.getDataStores('contacts').then(function success(dsList) {
          dsList.forEach(function(aDs) {
            datastores[aDs.owner] = aDs;
          });
          // This is needed because mozContact DB is not exposed as a Datastore
          // Once bug 1016838 lands this will not be needed
          datastores[MOZ_CONTACTS_OWNER] = new MozContactsDatastore();
          resolve(datastores[owner]);
          datastoresLoading = false;
          document.dispatchEvent(new CustomEvent(DS_READY_EVENT));
        }, function err(error) {
            console.error('Error while obtaining datastores: ', error.name);
        });
      }
    });
  }

  // Adapter object to obtain data from the mozContacts as if it were a DS
  // Once bug 1016838 lands this will not be needed
  function MozContactsDatastore() {
  }

  MozContactsDatastore.prototype = {
    get: function(id) {
      return new Promise(function(resolve, reject) {

        var options = {
          filterBy: ['id'],
          filterOp: 'equals',
          filterValue: id
        };

        var req = navigator.mozContacts.find(options);

        req.onsuccess = function() {
          resolve(JSON.parse(JSON.stringify(req.result[0])));
        };

        req.onerror = function() {
          reject(req.error);
        };
      });
    },
    get name() {
      return 'mozContacts';
    }
  };

  function getData(entry) {
    if (!entry || !entry.id || !Array.isArray(entry.entryData)) {
      return Promise.reject({
        name: 'InvalidEntry'
      });
    }

    return new Promise(function(resolve, reject) {
      var operations = [];

      var entryData = entry.entryData;

      var mozContactId;
      entryData.forEach(function fetchEntry(aEntry) {
        var owner = aEntry.origin;
        if (owner === MOZ_CONTACTS_OWNER) {
          mozContactId = aEntry.uid;
        }

        getDatastore(owner).then(function success(datastore) {
          operations.push(datastore.get(aEntry.uid));
          // It is needed to wait to have all operations ready
          if (operations.length === entryData.length) {
            execute(operations, resolve, reject, {
              targetId: entry.id,
              mozContactId: mozContactId
            });
          }
        }, function error(err) {
            console.error('Error while obtaining datastore: ', err.name);
            reject(err);
        });
      });
    });
  }


  function execute(operations, resolve, reject, options) {
    Promise.all(operations).then(function success(results) {
      if (results.length === 1) {
        results[0].id = options.targetId;
        resolve(results[0]);
        return;
      }

      if (options.mozContactId) {
        results = reorderResults(results, options.mozContactId);
      }

      LazyLoader.load('/shared/js/contacts/contacts_merger.js',
        function() {
          var matchings = createMatchingContacts(results);

          contacts.Merger.inMemoryMerge(results[0], matchings).then(
            function success(mergedResult) {
              mergedResult.id = options.targetId;
              resolve(mergedResult);
          }, function error(err) {
              console.log('Error while merging: ', err);
              reject(err);
          });
      });
    }, function error(err) {
        console.error('Error while getting data: ', err.name);
        reject(err);
    });
  }


  // This function reorders the contact data results array in order to
  // put the mozContact in the first position, as mozContact data will be taken
  // precedence over other datastore data
  function reorderResults(results, mozContactId) {
    var out = [];

    for (var j = 0; j < results.length; j++) {
      if (results[j].id === mozContactId) {
        out.unshift(results[j]);
      }
      else {
        out.push(results[j]);
      }
    }

    return out;
  }

  // This function adapts the result array to the input object expected by
  // the contacts_merger module
  function createMatchingContacts(results) {
    var out = [];

    for (var j = 1; j < results.length; j++) {
      out.push({
        matchingContact: results[j]
      });
    }

    return out;
  }

  return {
    'getData': getData
  };
})();
