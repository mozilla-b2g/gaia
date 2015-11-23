/* exported placesModel */

(function(exports) {
  'use strict';

  exports.placesModel = {
    /**
     * The places store name.
     * @memberof Places.prototype
     * @type {String}
     */
    STORE_NAME: 'places',

    /**
     * A reference to the places datastore.
     * @memberof Places.prototype
     * @type {Object}
     */
    dataStore: null,

    /**
     * Set when we are editing a place record in the datastore.
     * @memberof Places.prototype
     * @type {Boolean}
     */
    writeInProgress: false,

    getStore: function() {
      return new Promise(resolve => {
        if (this.dataStore) {
          return resolve(this.dataStore);
        }
        navigator.getDataStores(this.STORE_NAME).then(stores => {
          this.dataStore = stores[0];
          return resolve(this.dataStore);
        });
      });
    },

    /**
     * Formats a URL as a place object.
     * @param {String} url The URL of a place.
     * @return {Object}
     * @memberof Places.prototype
     */
    defaultPlace: function(url) {
      return {
        url: url,
        title: url,
        icons: {},
        frecency: 0,
        // An array containing previous visits to this url
        visits: [],
        screenshot: null,
        themeColor: null
      };
    },

    /**
     * Helper function to edit a place record in the datastore.
     * @param {String} url The URL of a place.
     * @param {Function} fun Handles place updates.
     * @memberof Places.prototype
     */
    editPlace: function(url, fun) {
      return new Promise(resolve => {
        this.getStore().then(store => {
          var rev = store.revisionId;
          store.get(url).then(place => {
            place = place || this.defaultPlace(url);
            fun(place, newPlace => {
              if (this.writeInProgress || store.revisionId !== rev) {
                return this.editPlace(url, fun);
              }
              this.writeInProgress = true;
              // Since we just checked that store.revisionId === rev, this
              // should not throw any 'RevisionId is not up-to-date' errors:
              store.put(newPlace, url, rev).then(() => {
                this.writeInProgress = false;
                resolve(newPlace);
              });
            });
          });
        });
      });
    },

    /**
     * Manually set the previous visits array of timestamps, used for
     * migrations
     */
    setVisits: function(url, visits) {
      return this.editPlace(url, (place, cb) => {
        place.visits = place.visits || [];
        place.visits = place.visits.concat(visits);
        place.visits.sort((a, b) => {
          return b - a;
        });
        cb(place);
      });
    },

    /**
     * Pin/unpin a page.
     *
     * @param {String} url The URL of the page to pin.
     * @param {Boolean} value true for pin, false for unpin.
     * @returns {Promise} Promise of a response.
     */
    setPinned: function(url, value) {
      return this.editPlace(url, (place, callback) => {
        place.pinned = value;
        if (value) {
          place.pinTime = Date.now();
        }
        callback(place);
      });
    },

    /**
     * Is a page currently pinned?
     *
     * @param {String} url The URL of the page to check.
     * @returns {Promise} Promise of a response.
     */
    isPinned: function(url) {
      return new Promise((resolve, reject) => {
        return this.getStore()
          .then(store => {
            return store.get(url);
          })
          .then(place => {
            return resolve(!!place.pinned);
          })
          .catch(e => {
            console.error(`Error getting the page details: ${e}`);
            return reject(e);
          });
      });
    },

    /*
     * Add a recorded visit to the history, we prune them to the last
     * TRUNCATE_VISITS number of visits and store them in a low enough
     * resolution to render the view (one per day)
     */
    TRUNCATE_VISITS: 10,

    addToVisited: function(place) {
      place.visits = place.visits || [];

      if (!place.visits.length) {
        place.visits.unshift(place.visited);
        return place;
      }

      // If the last visit was within the last 24 hours, remove
      // it as we only need a resolution of one day
      var lastVisit = place.visits[0];
      if (lastVisit > (Date.now() - 60 * 60 * 24 * 1000)) {
        place.visits.shift();
      }

      place.visits.unshift(place.visited);

      if (place.visits.length > this.TRUNCATE_VISITS) {
        place.visits.length = this.TRUNCATE_VISITS;
      }

      return place;
    },

    saveScreenshot: function(url, screenshot) {
      return this.editPlace(url, function(place, cb) {
        place.screenshot = screenshot;
        cb(place);
      });
    },

    /**
     * Update the theme color of a page in the places db.
     *
     * @param {String} url The URL of the page
     * @param {String} color The CSS color
     */
    saveThemeColor: function(url, color) {
      return this.editPlace(url, function(place, cb) {
        place.themeColor = color;
        cb(place);
      });
    },

    /**
     * Clear all the visits in the store but the pinned pages.
     *
     * @return Promise
     */
    clearHistory: function() {
      return new Promise((resolve, reject) => {
        return this.getStore().then(store => {
          store.getLength().then((storeLength) => {
            if (!storeLength) {
              return resolve();
            }

            new Promise((resolveInner, rejectInner) => {
              var urls = new Map();
              var cursor = store.sync();

              function cursorResolve(task) {
                switch (task.operation) {
                  case 'update':
                  case 'add':
                    urls.set(task.id, task.data);
                    break;

                  case 'remove':
                    urls.delete(task.id, task.data);
                    break;

                  case 'clear':
                    urls.clear();
                    break;

                  case 'done':
                    return resolveInner(urls);
                }

                cursor.next().then(cursorResolve, rejectInner);
              }

              cursor.next().then(cursorResolve, rejectInner);
            })
              .then((urls) => {
                var promises = [];

                urls.forEach((val, key) => {
                  if (val.pinned) {
                    // Clear the visit history of pinned pages.
                    promises.push(this.editPlace(key, function(place, cb) {
                      place.visits = [];
                      cb(place);
                    }));
                  } else {
                    // Remove all other pages from history.
                    promises.push(store.remove(key));
                  }
                });

                Promise.all(promises).then(resolve, reject);
              })
              .catch((e) => {
                console.error(`Error trying to clear browsing history: ${e}`);
                reject(e);
              });
          });
        });
      });
    },

    mergeRecordsToDataStore(localRecord, remoteRecord) {
      if (!localRecord || !remoteRecord ||
          localRecord.url !== remoteRecord.url) {
        // The local record has different url(id) with the new one.
        console.error('Inconsistent records on url', localRecord, remoteRecord);
        throw new Error('Inconsistent records on url');
      }
      if (!localRecord.fxsyncId && typeof remoteRecord.fxsyncId === 'string') {
        /* When a localRecord is existed without fxsyncId, assign fxsyncId to it
           from a remoteRecord. This case always happens at first
           synchronization or merging two records with the same URL. */
        localRecord.fxsyncId = remoteRecord.fxsyncId;
      } else if (localRecord.fxsyncId !== remoteRecord.fxsyncId) {
        // Two records have different fxsyncId but have the same url(id).
        console.log('Inconsistent records on FxSync ID',
          localRecord, remoteRecord);
        throw new Error('Inconsistent records on FxSync ID',
          localRecord, remoteRecord);
      }
      // We remember if a record had already been created locally before we got
      // remote data for that URL, so that we know not to remove it even when
      // the remote data is deleted. This applies only to readonly sync, and
      // will be removed when sync becomes read-write.
      if (localRecord.createdLocally === undefined) {
        localRecord.createdLocally = true;
      }

      localRecord.visits = localRecord.visits || [];
      // If a localRecord is without any visit records or with older visit
      // than remoteRecord, its title will be replaced by remoteRecord's.
      if ((localRecord.visits.length === 0 && remoteRecord.title) ||
          (remoteRecord.visits[0] >= localRecord.visits[0])) {
        localRecord.title = remoteRecord.title;
      }

      remoteRecord.visits.forEach(item => {
        if (localRecord.visits.indexOf(item) === -1) {
          localRecord.visits.push(item);
        }
      });

      localRecord.visits.sort((a, b) => {
        // sort in descending order
        return b - a;
      });

      return localRecord;
    },

    addPlace(place, userid) {
      // 1. Get place by url(id of DataStore)
      // 2.A Merge the existing one and new one if it's an existing one,
      //     and update the places.
      // 2.B Add a new record with RevisionId.
      // 3. Add the DataStore record ID into LocalID <-> RemoteID matching
      //    table.

      var id = place.url;
      var revisionId;
      return this.getStore().then(placesStore => {
        revisionId = placesStore.revisionId;
        return placesStore.get(id).then(existedPlace => {
          if (existedPlace) {
            var newPlace = this.mergeRecordsToDataStore(existedPlace, place);
            return placesStore.put(newPlace, id, revisionId);
          }
          // Setting createdLocally to false will cause the record to be deleted
          // again if it's deleted remotely. This applies only to readonly sync,
          // and will be removed when sync becomes read-write.
          place.createdLocally = false;
          return placesStore.add(place, id, revisionId);
        });
      });
    },

    deleteByDataStoreId(id) {
      return this.getStore().then(store => {
        var revisionId = store.revisionId;
        return store.get(id).then(record => {
          // Do not delete records that were originally created locally, even if
          // they are deleted remotely. This applies only for readonly sync, and
          // will be removed in the future when we switch to two-way sync.
          if (record.createdLocally) {
            return Promise.resolve();
          }
          return store.remove(id, revisionId);
        });
      });
    },

    checkIfClearedSince(lastRevisionId, userid) {
      return this.getStore().then(store => {
        if (lastRevisionId === null) {
          var cursor = store.sync();
          // Skip first task which is always { id: null, operation: 'clear' }
          cursor.next().then(() => {
            return cursor;
          });
        }
        return store.sync(lastRevisionId);
      }).then(cursor => {
        var wasCleared = false;
        return new Promise(resolve => {
          function runNextTask(cursor) {
            cursor.next().then(task => {
              if (task.operation === 'done') {
                resolve({
                  newRevisionId: task.revisionId,
                  wasCleared
                });
              } else {
                // In readonly mode, if the DataStore was cleared, or some
                // records were removed, it's possible that previously imported
                // data was lost. Therefore, we return wasCleared: true after
                // playing the DataStore history to its current revisionId, so
                // that removeSyncedCollectionMtime will be called, and a full
                // re-import is triggered.
                // If only one record was removed then it would not be necessary
                // to re-import the whole Kinto collection, but right now we
                // have no efficient way to retrieve just one record from the
                // Kinto collection based on URL, because we don't have a
                // mapping from URL to fxsyncId. Since readonly sync is
                // idempotent, there is not much harm in this, but it could
                // possibly be made more efficient, see
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1223418.
                if (['clear', 'remove'].indexOf(task.operation) !== -1) {
                  wasCleared = true;
                }
                // Avoid stack overflow:
                setTimeout(() => {
                  // Will eventually get to a 'done' task:
                  runNextTask(cursor);
                });
              }
            });
          }
          runNextTask(cursor);
        });
      });
    }
  };
})(this);
