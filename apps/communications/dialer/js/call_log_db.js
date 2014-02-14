'use strict';

var CallLogDBManager = {
  _db: null,
  _dbName: 'dialerRecents',
  _dbRecentsStore: 'dialerRecents',
  _dbGroupsStore: 'dialerGroups',
  _dbVersion: 5,
  _maxNumberOfGroups: 200,
  _numberOfGroupsToDelete: 30,

  _observers: {},

  /**
   * Add a observer of the 'upgradeneeded' event, which is fired as soon as the
   * indexedDB API fires an 'onupgradeneeded' event while trying to open the
   * database.
   * We need to notify the UI about a database upgrade so the proper feedback
   * can be provided to the user. Database upgrades can be quite large.
   */
  set onupgradeneeded(callback) {
    this._addObserver('upgradeneeded', callback);
  },

  /**
   * Add a observer of the 'upgradedone' event, which is fired as soon as we
   * push the latest upgraded record into the upgraded object stores.
   */
  set onupgradedone(callback) {
    this._addObserver('upgradedone', callback);
  },

  /**
   * Add a observer of 'upgradeprogress' events that are fired every 10% of
   * the database upgrade process if the amount of work required is known.
   */
  set onupgradeprogress(callback) {
    this._addObserver('upgradeprogress', callback);
  },

  _addObserver: function _addObserver(message, callback) {
    if (!this._observers[message]) {
      this._observers[message] = [];
    }
    this._observers[message].push(callback);
  },

  _notifyObservers: function _notifyObservers(message, value) {
    var observers = this._observers[message];
    if (!observers) {
      return;
    }

    for (var callback in observers) {
      if (observers[callback] && typeof observers[callback] === 'function') {
        observers[callback](value);
      }
    }
  },

  _asyncReturn: function _asyncReturn(callback, result) {
    if (callback && callback instanceof Function) {
      callback(result);
    }
  },

  /*
   * Prepare the database. This may include opening the database and upgrading
   * it to the latest schema version.
   *
   * param callback
   *        Function that takes an error and db argument. It is called when
   *        the database is ready to use or if an error occurs while preparing
   *        the database.
   *
   * return (via callback) a database ready for use.
   */
  _ensureDB: function ensureDB(callback) {
    if (this._db) {
      callback(null, this._db);
      return;
    }

    LazyLoader.load(['/dialer/js/utils.js',
                     '/dialer/js/contacts.js'], (function() {
      try {
        var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                        window.mozIndexedDB || window.msIndexedDB;
        if (!indexedDB) {
          callback('NO_INDEXED_DB_AVAILABLE', null);
          return;
        }

        var self = this;
        var request = indexedDB.open(this._dbName, this._dbVersion);
        request.onsuccess = (function onsuccess(event) {
          this._db = event.target.result;
          callback(null, this._db);
        }).bind(this);

        request.onerror = function onerror(event) {
          callback(event.target.errorCode, null);
        };

        request.onblocked = function onblocked() {
          callback('DB_REQUEST_BLOCKED', null);
        };

        request.onupgradeneeded = function onupgradeneeded(event) {
          // Notify the UI about the need to upgrade the database.
          self._notifyObservers('upgradeneeded');

          var db = event.target.result;
          var txn = event.target.transaction;
          var currentVersion = event.oldVersion;

          function update(currentVersion) {
            var next = update.bind(self, currentVersion + 1);

            switch (currentVersion) {
              case 0:
                self._createSchema(db, next);
                break;
              case 1:
                self._upgradeSchemaVersion2(db, txn, next);
                break;
              case 2:
                self._upgradeSchemaVersion3(next);
                break;
              case 3:
                self._upgradeSchemaVersion4(db, txn, next);
                break;
              case 4:
                self._upgradeSchemaVersion5(next);
                break;
              case 5:
                // we have finished the upgrades. please keep this
                // in sync for future upgrades, since otherwise it
                // will call the default: and abort the transaction :(
                self._notifyObservers('upgradedone');
                break;
              default:
                event.target.transaction.abort();
                break;
            }
            currentVersion++;
          }

          update(currentVersion);
        };
      } catch (ex) {
        callback(ex.message, null);
      }
    }).bind(this));
  },
  /**
   * Start a new database transaction.
   *
   * param txnType
   *        Type of transaction (e.g. 'readwrite').
   * param callback
   *        Function to call when the transaction is available. It will be
   *        invoked with the transaction and the requested object stores.
   * param objectStores
   *        The names of object stores and indexes that are in the scope of the
   *        new transaction as an array of strings. Specify only the object
   *        stores that you need to access. If you need to access only one
   *        object store, you can specify its name as a string.
   */
  _newTxn: function newTxn(txnType, objectStores, callback) {
    if (!objectStores) {
      objectStores = [this._dbGroupsStore];
    }
    if (!Array.isArray(objectStores)) {
      objectStores = [objectStores];
    }
    this._ensureDB(function(error, db) {
      if (error) {
        callback(error);
        return;
      }
      var txn = db.transaction(objectStores, txnType);
      var stores;
      if (objectStores.length === 1) {
        stores = txn.objectStore(objectStores[0]);
      } else {
        stores = [];
        for (var i = 0; i < objectStores.length; i++) {
          stores.push(txn.objectStore(objectStores[i]));
        }
      }
      callback(null, txn, stores);
    });
  },
  close: function rbdm_close() {
    this._db.close();
    this._db = null;
  },
  /**
   * Create the initial database schema.
   *
   * param db
   *        Database instance.
   */
  _createSchema: function createSchema(db, next) {
    // The object store hosting the recents calls will contain entries like:
    // { date: <Date> (primary key),
    //   number: <String>,
    //   type: <String>,
    //   groupId: <Number> }
    var objStore = db.createObjectStore(this._dbRecentsStore,
                                        { keyPath: 'date' });
    objStore.createIndex('number', 'number');

    next();
  },
  /**
   * Upgrade schema to version 2. Create an object store to host groups of
   * calls and populate this store with the already existing recent calls
   * data.
   *
   * param db
   *        Database instance.
   * param transaction
   *        IDB transaction instance.
   */
  _upgradeSchemaVersion2:
    function upgradeSchemaVersion2(db, transaction, next) {
    // This object store can be used to quickly construct a group view of the
    // recent calls database. Each entry looks like this:
    //
    // { id: <String> (Primary key, hash created from number and date)
    //   number: <String>,
    //   contact: <String>,
    //   date: <Date>,
    //   type: <String>,
    //   retryCount: <Number> }
    //
    //  'retryCount' is incremented when we store a call of the same 'type'
    //  and resetted to 1 otherwise.
    //
    //  We store 'number' and 'contact' separatedly so we allow searches by
    //  these fields without being dependent of the contacts API.
    var groupsStore = db.createObjectStore(this._dbGroupsStore,
                                           { keyPath: 'id' });
    // We create an index for 'groupId' in the object store hosting the
    // actual calls. Each call belongs to a group indexed by id.
    var recentsStore = transaction.objectStore(this._dbRecentsStore);
    recentsStore.createIndex('groupId', 'groupId');

    next();
  },
  /**
   * All the required changes for v3 are done while upgrading to v4.
   */
  _upgradeSchemaVersion3: function upgradeSchemaVersion3(next) {
    // Do nothing.
    next();
  },
  /**
   * Upgrade schema to version 4. Recreate the object store to host groups of
   * calls with a new schema changing the old string primary key for an array
   * which will contain the date of the first call of the group, the phone
   * number associated with the call, the type of the call (incoming, dialing)
   * and the status of the call (accepted or not). We also add a new
   * 'lastEntryDate' field containing the date of the last call of the group
   * and substitute the unused 'contact' field by a more detailed contact
   * information to avoid querying the contacts API database each time that
   * we need to render the call log.
   *
   * param db
   *        Database instance.
   * param transaction
   *        IDB transaction instance.
   */
  _upgradeSchemaVersion4:
    function upgradeSchemaVersion4(db, transaction, next) {

    var self = this;

    var waitForAsyncCall = 0;
    var cursorDone = false;

    var groups = {};
    var recentsCount = 0;
    var groupCount = 0;

    function onGroupsDone() {
      if (!cursorDone || waitForAsyncCall) {
        return;
      }

      if (groupCount == 0) {
        next();
        return;
      }

      // Once we built all the group of calls we can push them to the
      // groups object store and notify the UI about it.
      self._newTxn('readwrite', [self._dbGroupsStore],
                   function(error, txn, store) {
        if (error) {
          console.log('Error upgrading the database ' + error);
          return;
        }

        for (var group in groups) {
          store.put(groups[group]).onsuccess = function onsuccess() {
            groupCount--;
            if (groupCount == 0) {
              next();
            }
          };
          delete groups[group];
        }
      });
    }

    // Populate quick group view with already existing calls information.
    function populateGroups() {
      // We send 'upgradeprogress' events from two different places:
      // 1- For each 15% of the recentsStore cursor requests completed.
      //    We increment the progress by 10%, leaving the total amount
      //    in 60%.
      // 2- For each 25% of the Contacts API requests completed. We
      //    also increment the progress by 10%, leaving the total
      //    amount in 90%.
      // The final progress 100% event is avoided as we send a 'upgradedone'
      // event instead.
      var percent = parseInt(recentsCount * 0.15);
      var countToProgressEvent = percent;
      var percent2 = parseInt(recentsCount * 0.25);
      var countToProgressEvent2 = percent2;
      var progress = 0;

      recentsStore.openCursor().onsuccess = function onsuccess(event) {
        if (countToProgressEvent === 0) {
          countToProgressEvent = percent;
          progress += 10;
          self._notifyObservers('upgradeprogress', progress);
        } else {
          countToProgressEvent--;
        }

        var cursor = event.target.result;
        if (!cursor) {
          // As soon as the cursor is done, we bail out. We still need to wait
          // for all the async calls to retrieve the contacts information to
          // finish before pushing the data to the groups object store. We will
          // notify the UI about that so it can request the data again.
          cursorDone = true;
          onGroupsDone();
          return;
        }

        var record = cursor.value;
        var type = '';
        var status;
        // Get group type and status.
        switch (record.type) {
          case 'incoming-connected':
            type = 'incoming';
            status = 'connected';
            break;
          case 'incoming-refused':
            type = 'incoming';
            break;
          default:
            if (record.type && record.type.indexOf('dialing') != -1) {
              type = 'dialing';
            }
            break;
        }

        // Create the id and a temporary unique key for the group.
        var id = self._getGroupId({
          date: record.date,
          number: record.number,
          type: type,
          status: status
        });
        var date = new Date(record.date);
        var key = date.getDay() + date.getMonth() + date.getFullYear() +
                  record.number + type;
        if (status) {
          key += status;
        }

        // Get the contact information associated with the number.
        waitForAsyncCall++;
        Contacts.findByNumber(record.number,
                              function(contact, matchingTel) {
          if (countToProgressEvent2 === 0) {
            countToProgressEvent2 = percent2;
            progress += 10;
            self._notifyObservers('upgradeprogress', progress);
          } else {
            countToProgressEvent2--;
          }

          // Store the group or increment the 'retryCount' field if we already
          // created a group for this call.
          if (key in groups) {
            // Groups should have the date of the newest call.
            if (groups[key].lastEntryDate <= record.date) {
              groups[key].lastEntryDate = record.date;
            }
            groups[key].retryCount++;
          } else {
            var group = {
              id: id,
              number: record.number,
              lastEntryDate: record.date,
              retryCount: 1
            };
            if (contact && contact !== null) {
              group.contactId = contact.id;
              var photo = ContactPhotoHelper.getThumbnail(contact);
              if (photo) {
                group.contactPhoto = photo;
              }
              if (matchingTel) {
                var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel,
                                                                  contact);
                if (Array.isArray(primaryInfo)) {
                  primaryInfo = primaryInfo[0];
                }
                group.contactPrimaryInfo = String(primaryInfo);
                if (Array.isArray(matchingTel.type) && matchingTel.type[0]) {
                  group.contactMatchingTelType = String(matchingTel.type[0]);
                }
                if (matchingTel.carrier) {
                  group.contactMatchingTelCarrier = String(matchingTel.carrier);
                }
              }
            }
            groups[key] = group;
            groupCount++;
          }
          waitForAsyncCall--;
          onGroupsDone();
        });
        cursor.continue();
      };
    }

    var groupsStore = transaction.objectStore(self._dbGroupsStore);
    // First of all we delete the old groups object store.
    db.deleteObjectStore(self._dbGroupsStore);

    // We recreate the object store that can be used to quickly construct a
    // group view of the recent calls database. Each entry looks like this:
    // { id: [date<Date>, number<String>, type<String>, status<String>],
    //   lastEntryDate: <Date>, (index)
    //   retryCount: <Number>,
    //   number: <String>, (index)
    //   contactId: <String>, (index)
    //   contactPrimaryInfo: <String>,
    //   contactMatchingTelType: <String>,
    //   contactMatchingTelCarrier: <String>,
    //   contactPhoto: <Blob> }
    //
    //  The <Date> value from the 'id' field contains only the day of the call.
    //
    //  'lastEntryDate' contains a full date.
    //
    //  'retryCount' is incremented when we store a new call.
    var groupsStore = db.createObjectStore(self._dbGroupsStore,
                                           { keyPath: 'id' });

    // We create indexes for 'contact-id', 'number' and 'lastEntryDate'
    // as we will be searching by number, contact and date.
    // Unfortunately, even if we have the number data in the group id field, we
    // can't search for [*, "exact number match", *, *], so we need a new
    // 'number' index.
    groupsStore.createIndex('number', 'number');
    groupsStore.createIndex('contactId', 'contactId');
    groupsStore.createIndex('lastEntryDate', 'lastEntryDate');

    // We get the number of calls stored in the database so we can send
    // progress events with the appropriate percentage of upgrade process
    // completed.
    var recentsStore = transaction.objectStore(self._dbRecentsStore);
    recentsStore.count().onsuccess = function(event) {
      recentsCount = event.target.result;
      populateGroups();
    };
  },
  /**
   * Nothing to be done for version 5 since 'voicemail' and 'emergency' boolean
   * flags don't need a schema upgrade: their default value is false for
   * already existent data.
   */
  _upgradeSchemaVersion5: function upgradeSchemaVersion5(next) {
    next();
  },
  /**
   * Helper function to get the group ID from a recent call object.
   */
  _getGroupId: function getGroupId(recentCall) {
    var groupId = [Utils.getDayDate(recentCall.date),
                   (recentCall.number || ''), recentCall.type];
    if (recentCall.status && recentCall.type === 'incoming') {
      groupId.push(recentCall.status);
    }
    return groupId;
  },
  /**
   * Helper function to get a more usable group object.
   *
   * Group objects are stored in the database as:
   *
   * { id: [date<Date>, number<String>, type<String>, status<String>]
   *   number: <String>,
   *   lastEntryDate: <Date>,
   *   retryCount: <Number>,
   *   contactId: <String>,
   *   contactPrimaryInfo: <String>,
   *   contactMatchingTelType: <String>,
   *   contactMatchingTelCarrier: <String>,
   *   contactPhoto: <Blob>,
   *   emergency: <Bool>,
   *   voicemail: <Bool> }
   *
   * but consumers might find this format hard to handle, so we unwrap the
   * data inside the 'id' and contact related fields to create a more
   * manageable object of this form:
   *
   * {
   *   id: <String>,
   *   date: <Date>,
   *   number: <String>,
   *   type: <String>,
   *   status: <String>,
   *   lastEntryDate: <Date>,
   *   retryCount: <Number>,
   *   contact: {
   *    id: <String>,
   *    primaryInfo: <String>,
   *    matchingTel: {
   *      number: <String>,
   *      type: <String>,
   *      carrier: <String>
   *    },
   *    photo: <Blob>
   *   },
   *   emergency: <Bool>,
   *   voicemail: <Bool>
   * }
   */
  _getGroupObject: function getGroupObject(group) {
    if (!Array.isArray(group.id) || group.id.length < 3) {
      return null;
    }

    var contact;
    if (group.contactId) {
      contact = {
        id: group.contactId,
        primaryInfo: group.contactPrimaryInfo,
        matchingTel: {
          number: group.id[1],
          type: group.contactMatchingTelType,
          carrier: group.contactMatchingTelCarrier
        },
        photo: group.contactPhoto
      };
    }

    return {
      id: group.id.join('-'),
      date: group.id[0],
      number: group.id[1],
      type: group.id[2],
      status: group.id[3] || undefined,
      lastEntryDate: group.lastEntryDate,
      retryCount: group.retryCount,
      contact: contact,
      emergency: group.emergency,
      voicemail: group.voicemail
    };
  },
  /**
   * Ensures that the DB size is not bigger than _maxNumberOfGroups. If the DB
   * is fat enough, we delete the number of groups higher than
   * _maxNumberOfGroups (most likely 1) plus _numberOfGroupsToDelete to make
   * some extra space.
   */
  _keepDbPrettyAndFit: function _keepDbPrettyAndFit(callback) {
    var self = this;
    this._newTxn('readonly', this._dbGroupsStore, function(error, txn, store) {
      if (error) {
        return;
      }

      var req = store.count();
      req.onsuccess = function() {
        var groupsToDelete = req.result - self._maxNumberOfGroups;
        if (groupsToDelete > 0) {
          groupsToDelete += self._numberOfGroupsToDelete;
          var cursorReq = store.index('lastEntryDate').openCursor();
          cursorReq.onsuccess = function() {
            var cursor = cursorReq.result;
            if (!cursor || !groupsToDelete) {
              if (callback && callback instanceof Function) {
                callback();
              }
              return;
            }
            groupsToDelete--;
            self.deleteGroup(null, cursor.value.id);
            cursor.continue();
          };
        } else if (callback && callback instanceof Function) {
          callback();
        }
      };
    });
  },
  /**
   * Stores a new call in the database.
   *
   * param recentCall
   *        Object representing the new call to be stored with this form:
   *        { number: <String>,
   *          type: <String>,
   *          status: <String>,
   *          date: <Date>,
   *          emergency: <Bool>,
   *          voicemail: <Bool> }
   *
   * param callback
   *        Function to be called when the transaction is done.
   *
   * return (via callback) the object representing the group where the call
   *                       belongs to or an error message if needed.
   */
  add: function add(recentCall, callback) {
    if (typeof recentCall !== 'object') {
      callback('INVALID_CALL');
      return;
    }

    var self = this;
    this._newTxn('readwrite', [this._dbRecentsStore, this._dbGroupsStore],
                 function(error, txn, stores) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      var recentsStore = stores[0];
      var groupsStore = stores[1];

      var groupId = self._getGroupId(recentCall);

      // For adding a call to the database we first create or update its
      // corresponding group and then we store the actual call adding the id
      // of the group where it belongs.
      groupsStore.get(groupId).onsuccess = function onsuccess() {
        var group = this.result;
        if (group) {
          // Groups should have the date of the newest call.
          if (group.lastEntryDate <= recentCall.date) {
            group.lastEntryDate = recentCall.date;
            group.emergency = recentCall.emergency;
            group.voicemail = recentCall.voicemail;
          }
          group.retryCount++;
          groupsStore.put(group).onsuccess = function onsuccess() {
            self._asyncReturn(callback, self._getGroupObject(group));
          };
        } else {
          group = {
            id: groupId,
            number: recentCall.number,
            lastEntryDate: recentCall.date,
            retryCount: 1,
            emergency: recentCall.emergency,
            voicemail: recentCall.voicemail
          };
          Contacts.findByNumber(recentCall.number,
                                function(contact, matchingTel) {
            if (contact && contact !== null) {
              group.contactId = contact.id;
              var photo = ContactPhotoHelper.getThumbnail(contact);
              if (photo) {
                group.contactPhoto = photo;
              }
              if (matchingTel) {
                var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel,
                                                                  contact);
                if (Array.isArray(primaryInfo)) {
                  primaryInfo = primaryInfo[0];
                }
                group.contactPrimaryInfo = String(primaryInfo);

                if (Array.isArray(matchingTel.type) && matchingTel.type[0]) {
                  group.contactMatchingTelType = String(matchingTel.type[0]);
                } else {
                  group.contactMatchingTelType = String(matchingTel.type);
                }

                if (matchingTel.carrier) {
                  group.contactMatchingTelCarrier = String(matchingTel.carrier);
                }
              }
            }

            self._newTxn('readwrite', [self._dbGroupsStore],
                         function(error, txn, store) {
              store.add(group).onsuccess = function onsuccess() {
                // Once the group has successfully been added, we check that the
                // db size is below the max size set.
                self._keepDbPrettyAndFit(function() {
                  self._asyncReturn(callback, self._getGroupObject(group));
                });
              };
            });
          });
        }

        recentCall.groupId = groupId;
        recentsStore.put(recentCall);
      };
    });
  },
  /**
   * Delete a group of calls and all the calls belonging to that group.
   *
   * param group
   *        Group object to be deleted.
   * param groupId
   *        Identifier of the group to be deleted. We expect a group object or
   *        its identifier.
   *
   * return (via callback) count of deleted calls or error if needed.
   */
  deleteGroup: function deleteGroup(group, groupId, callback) {
    // Valid group doesn't need to contain number, we can receive
    // calls from unknown or hidden numbers as well
    if (!groupId &&
        (!group || typeof group !== 'object' || !group.date || !group.type)) {
      callback('NOT_VALID_GROUP');
      return;
    }

    var self = this;

    this._newTxn('readwrite', [this._dbGroupsStore, this._dbRecentsStore],
                 function(error, txn, stores) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      var groupsStore = stores[0];
      var recentsStore = stores[1];

      if (!groupId) {
        groupId = self._getGroupId(group);
      }

      // We delete the given group and all its corresponding calls.
      groupsStore.delete(groupId).onsuccess = function onsuccess() {
        var deleted = 0;
        recentsStore.index('groupId').openCursor(groupId)
                    .onsuccess = function onsuccess(event) {
          var cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            self._asyncReturn(callback, deleted);
          }
        };
      };
    });
  },
  /**
   * Delete a list of groups of calls and all its belonging calls.
   *
   * param groupList
   *        Array of group objects to be deleted.
   * param deletedCount
   *        Accumulator of the number of deleted groups of calls.
   *
   * return (via callback) count of deleted calls or an error message if
   *                       needed.
   */
  deleteGroupList: function deleteGroupList(groupList, callback,
                                            deletedCount) {
    if (!deletedCount) {
      deletedCount = 0;
    }

    var self = this;

    if (groupList.length > 0) {
      var itemToDelete = groupList.pop();
      if (typeof itemToDelete !== 'object') {
        self._asyncReturn(callback, 'INVALID_GROUP_IN_LIST');
        return;
      }

      var ondeleted = function ondeleted(result) {
        // We expect a number. Otherwise that means that we got an error
        // message.
        if (typeof result !== 'number') {
          self._asyncReturn(callback, result);
          return;
        }
        deletedCount += result;
        self.deleteGroupList(groupList, callback, deletedCount);
      };

      self.deleteGroup(itemToDelete, null, ondeleted);
    } else {
      self._asyncReturn(callback, deletedCount);
    }
  },
  /**
   * Delete all!
   *
   * param callback
   *        Function to be called to clear the database.
   *
   * return (via callback) error message if needed.
   */
  deleteAll: function deleteAll(callback) {
    var self = this;
    this._newTxn('readwrite', [this._dbRecentsStore, this._dbGroupsStore],
                 function(error, txn, stores) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      var recentsStore = stores[0];
      var groupsStore = stores[1];

      recentsStore.clear().onsuccess = function onsuccess() {
        groupsStore.clear().onsuccess = function onsuccess() {
          self._asyncReturn(callback);
        };
      };
    });
  },
  /**
   * Delete the storaged database file.
   *
   * param callback
   *        Function to be called after the deletion of the database.
   */
  deleteDb: function deleteDb(callback) {
    var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                    window.mozIndexedDB || window.msIndexedDB;
    if (!indexedDB) {
      callback('NO_INDEXEDDB_AVAILABLE');
      return;
    }
    // We need to close the DB before deleting it.
    if (this._db) {
      this._db.close();
    }

    var self = this;
    var req = indexedDB.deleteDatabase(this._dbName);
    req.onsuccess = function onsuccess() {
      self._asyncReturn(callback);
    };
    req.onerror = function onerror() {
      self._asyncReturn(callback, req.error.name);
    };
  },
  /**
   * Helper for getting a list of all the records stored in a given object
   * store.
   *
   * param storeName
   *        Name of the store to be queried.
   * param callback
   *        Function to be called after getting the record list or when an
   *        error is catched.
   * param sortedBy
   *        Field to sort by. Take into account that sorting by not indexed
   *        fields is quite slow.
   * param prev
   *        Boolean flag to get the list in reverse order.
   * param getCursor
   *        Boolean flag to get an IDB cursor instead of the whole list. This
   *        can be used for infinite scrolling for example.
   * param limit
   *        Maximum number of records to be fetched from the database.
   *
   * return (via callback) the whole list of requested records, a cursor or an
   *                        error message if needed.
   */
  _getList: function getList(storeName, callback, sortedBy, prev,
                             getCursor, limit) {
    if (!callback || !callback instanceof Function) {
      return;
    }

    var self = this;
    this._newTxn('readonly', [storeName], function(error, txn, store) {
      if (error) {
        callback(error);
        return;
      }

      var cursor = null;
      var direction = prev ? 'prev' : 'next';
      if (sortedBy && sortedBy !== null) {
        if (!store.indexNames.contains(sortedBy) && sortedBy != 'id') {
          callback('INVALID_SORTED_BY_KEY');
          txn.abort();
          return;
        }
        cursor = store.index(sortedBy).openCursor(null, direction);
      } else {
        cursor = store.openCursor(null, direction);
      }
      var result = [];
      cursor.onsuccess = function onsuccess(event) {
        var item = event.target.result;

        if (item && getCursor) {
          if (storeName === self._dbGroupsStore) {
            callback({
              value: self._getGroupObject(item.value),
              continue: function() { return item.continue(); }
            });
          } else {
            callback(item);
          }
          return;
        }

        if (item && (typeof limit === 'undefined' || limit > 0)) {
          if (storeName === self._dbGroupsStore) {
            result.push(self._getGroupObject(item.value));
          } else {
            result.push(item.value);
          }
          if (limit) {
            limit--;
          }
          item.continue();
        } else {
          callback(result);
        }
      };
      cursor.onerror = function onerror(event) {
        callback(event.target.error.name);
      };
    });
  },
  /**
   * Get the list of recent calls.
   *
   * param callback
   *        Function to be called after getting the list of recent calls or
   *        the IDB cursor in case of 'getCursor' param is true.
   * param sortedBy
   *        Field to sort by. Take into account that sorting by not indexed
   *        fields is quite slow.
   * param prev
   *        Boolean flag to get the list in reverse order.
   * param getCursor
   *        Boolean flag to request an IDB cursor instead of the whole list of
   *        records.
   * param limit
   *        Maximum number of records to be fetched from the database.
   *
   * return (via callback) the whole list of recent calls, a cursor or an
   *                        error message if needed.
   */
  getRecentList: function getRecentList(callback, sortedBy, prev,
                                        getCursor, limit) {
    this._getList(this._dbRecentsStore, callback, sortedBy, prev, getCursor,
                  limit);
  },
  /**
   * Get the list of groups of calls.
   *
   * param callback
   *        Function to be called after getting the list of groups or the
   *        IDB cursor in case of 'getCursor' param is true.
   * param sortedBy
   *        Field to sort by. Take into account that sorting by not indexed
   *        fields is quite slow.
   * param prev
   *        Boolean flag to get the list in reverse order.
   * param getCursor
   *        Boolean flag to request an IDB cursor instead of the whole list of
   *        records.
   * param limit
   *        Maximum number of records to be fetched from the database.
   *
   * return (via callback) the whole list of groups, a cursor or an error
   *                        message if needed.
   */
  getGroupList: function getGroupList(callback, sortedBy, prev,
                                      getCursor, limit) {
    // The primary key of the groups object store contains the 'number', 'type'
    // and 'status' fields.
    if (sortedBy === 'number' || sortedBy === 'type' || sortedBy === 'status') {
      sortedBy = null;
    }
    this._getList(this._dbGroupsStore, callback, sortedBy, prev, getCursor,
                  limit);
  },
  /**
   * Get the call group which is the nth group with matched type
   *
   * param position
   *        To indicate the nth group is requested, 1 means the last one
   * param sortedBy
   *        Field to sort by.
   * param prev
   *        Boolean flag to get the list in reverse order.
   * param type
   *        Type to indicate whether we want 'dialing' (outgoing)
   *        or 'incoming' call groups.
   *        If not specified, will match any types.
   * param callback
   *        Function to be called with the last group or an error message if
   *        needed.
   * return (via callback) the group or an error message if needed.
   */
  getGroupAtPosition: function rdbm_getGroupAtPosition(position, sortedBy, prev,
                                                       type, callback) {
    if (!callback || !callback instanceof Function) {
      return;
    }

    var self = this;
    this._newTxn('readonly', this._dbGroupsStore,
                 function(error, txn, store) {
      if (error) {
        callback(error);
        return;
      }

      try {
        var request = null;
        var direction = prev ? 'prev' : 'next';
        if (sortedBy && sortedBy !== null) {
          request = store.index(sortedBy).openCursor(null, direction);
        } else {
          request = store.openCursor(null, direction);
        }

        var i = 0;

        request.onsuccess = function(event) {
          var cursor = event.target.result;
          if (!cursor) {
            callback(null);
            return;
          }

          var recentGroup = self._getGroupObject(cursor.value);
          var matched = !type || recentGroup.type.indexOf(type) != -1;
          if (matched) {
            i++;
          }

          if (matched && i == position) {
            callback(recentGroup);
          } else {
            cursor.continue();
          }
        };

        request.onerror = function(event) {
          callback(event.target.error.name);
        };
      } catch (e) {
        callback(e);
      }
    });
  },

  /**
   * Get the call with the most recent date.
   *
   * param callback
   *        Function to be called with the last call or an error message if
   *        needed.
   *
   * return (via callback) the last call or an error message if needed.
   */
  getLastCall: function getLastCall(callback) {
    if (!callback || !callback instanceof Function) {
      return;
    }

    this._newTxn('readonly', [this._dbRecentsStore],
                 function(error, txn, store) {
      if (error) {
        callback(error);
        return;
      }

      var cursor = store.openCursor(null, 'prev');
      cursor.onsuccess = function onsuccess(event) {
        var item = event.target.result;
        if (item && item.value) {
          callback(item.value);
        } else {
          callback(null);
        }
      };
      cursor.onerror = function onerror(event) {
        callback(event.target.error.name);
      };
    });
  },

  /**
   * We store a revision number for the contacts data local cache that we need
   * to keep synced with the Contacts API database.
   * This method stores the revision of the Contacts API database and it will
   * be called after refresing the local cache because of a contact updated, a
   * contact deletion or a cache sync.
   */
  _updateCacheRevision: function _updateCacheRevision() {
    Contacts.getRevision(function(contactsRevision) {
      if (contactsRevision) {
        window.asyncStorage.setItem('contactCacheRevision',
                                    contactsRevision);
      }
    });
  },

  /**
   * Updates the records from the groups object store with a given contact
   * information.
   * This function will likely be called within the handlers of the
   * 'oncontactchange' event.
   *
   * param contact
   *        Contact object
   * param callback
   *        Function to be called after updating the group or when an error
   *        is found.
   *
   * return (via callback) count of affected records or an error message if
   *                       needed.
   */
  updateGroupContactInfo: function updateGroupContactInfo(contact,
                                                          matchingTel,
                                                          callback) {

    var self = this;
    this._newTxn('readwrite', [this._dbGroupsStore],
                  function(error, txn, store) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      if (!contact) {
        self._asyncReturn(callback, 0);
        return;
      }

      var count = 0;
      var req = store.index('number')
                     .openCursor(IDBKeyRange.only(matchingTel.value));
      req.onsuccess = function onsuccess(event) {
        var cursor = event.target.result;
        if (cursor && cursor.value) {
          var group = cursor.value;
          group.contactId = contact.id;
          var photo = ContactPhotoHelper.getThumbnail(contact);
          if (photo) {
            group.contactPhoto = photo;
          }
          if (matchingTel) {
            var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel,
                                                              contact);
            if (Array.isArray(primaryInfo) && primaryInfo[0]) {
              primaryInfo = primaryInfo[0];
            }
            group.contactPrimaryInfo = String(primaryInfo);
            if (Array.isArray(matchingTel.type) && matchingTel.type[0]) {
              group.contactMatchingTelType = String(matchingTel.type[0]);
            }
            if (matchingTel.carrier) {
              group.contactMatchingTelCarrier = String(matchingTel.carrier);
            }
          }
          cursor.update(group);
          count++;
          cursor.continue();
        } else {
          self._asyncReturn(callback, count);
          self._updateCacheRevision();
        }
      };
      req.onerror = function onerror(event) {
        self._asyncReturn(callback, event.target.error.name);
      };
    });
  },

  /**
   * Removes the contact information matching the given contact id from the
   * list of groups or the contact information from a specific group.
   *
   * This function will likely be called within the handlers of the
   * 'oncontactchange' event.
   *
   * param contactId
   *        Contact identifier to be removed from the DB.
   * param group
   *        Group object to remove the contact info from.
   * param callback
   *        Function to be called after updating the group or when an error
   *        is found.
   *
   * return (via callback) count of affected records or an error message if
   *                       needed.
   */
  removeGroupContactInfo: function removeGroupContactInfo(contactId,
                                                          group,
                                                          callback) {
    if (!contactId && !group) {
      this._asyncReturn(callback, 0);
      return;
    }

    var self = this;

    this._newTxn('readwrite', [this._dbGroupsStore],
                 function(error, txn, store) {
      if (error) {
        self._asyncReturn(callback, error);
        callback(error);
        return;
      }

      var count = 0;

      var req;
      if (contactId) {
        req = store.index('contactId').openCursor(contactId);
      } else if (group) {
        var groupId = self._getGroupId(group);
        req = store.openCursor(groupId);
      }
      req.onsuccess = function onsuccess(event) {
        var cursor = event.target.result;
        if (cursor) {
          var group = cursor.value;
          if (group.contactId) {
            delete group.contactId;
          }
          if (group.contactPrimaryInfo) {
            delete group.contactPrimaryInfo;
          }
          if (group.contactMatchingTelType) {
            delete group.contactMatchingTelType;
          }
          if (group.contactMatchingTelCarrier) {
            delete group.contactMatchingTelCarrier;
          }
          if (group.contactPhoto) {
            delete group.contactPhoto;
          }
          cursor.update(group);
          count++;
          cursor.continue();
        } else {
          self._asyncReturn(callback, count);
          self._updateCacheRevision();
        }
      };
      req.onerror = function onerror(event) {
        self._asyncReturn(callback, event.target.error.name);
      };
    });
  },
  invalidateContactsCache: function invalidateContactsCache(callback) {
    var self = this;
    var waitForAsyncCall = 0;
    var cursorDone = false;

    function onContactsUpdated() {
      if (!cursorDone || waitForAsyncCall) {
        return;
      }
      self._asyncReturn(callback);
      self._updateCacheRevision();
    }

    this._newTxn('readonly', [this._dbGroupsStore],
                  function(error, txn, store) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      var req = store.openCursor();
      req.onsuccess = function onsuccess(event) {
        var cursor = event.target.result;
        if (!cursor) {
          cursorDone = true;
          onContactsUpdated();
          return;
        }

        var group = cursor.value;
        waitForAsyncCall++;
        Contacts.findByNumber(group.number, function(contact, matchingTel) {
          // We don't want to queue db transactions that won't update
          // anything.
          var needsUpdate = false;
          if (!contact && !matchingTel) {
            if (group.contactId) {
              needsUpdate = true;
              delete group.contactId;
            }
            if (group.contactPhoto) {
              needsUpdate = true;
              delete group.contactPhoto;
            }
            if (group.contactPrimaryInfo) {
              needsUpdate = true;
              delete group.contactPrimaryInfo;
            }
            if (group.contactMatchingTelType) {
              needsUpdate = true;
              delete group.contactMatchingTelType;
            }
            if (group.contactMatchingTelCarrier) {
              needsUpdate = true;
              delete group.contactMatchingTelCarrier;
            }
          } else {
            group.contactId = contact.id;
            var photo = ContactPhotoHelper.getThumbnail(contact);
            if (photo && group.contactPhoto != photo) {
              group.contactPhoto = photo;
              needsUpdate = true;
            }
            var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel,
                                                              contact);
            if (Array.isArray(primaryInfo) && primaryInfo[0]) {
              primaryInfo = primaryInfo[0];
            }
            if (group.contactPrimaryInfo != String(primaryInfo)) {
              group.contactPrimaryInfo = String(primaryInfo);
              needsUpdate = true;
            }
            if (Array.isArray(matchingTel.type) && matchingTel.type[0] &&
                group.contactMatchingTelType != String(matchingTel.type[0])) {
              group.contactMatchingTelType = String(matchingTel.type[0]);
              needsUpdate = true;
            }
            if (matchingTel.carrier && group.contactMatchingTelCarrier !=
                String(matchingTel.carrier)) {
              group.contactMatchingTelCarrier = String(matchingTel.carrier);
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            self._newTxn('readwrite', [self._dbGroupsStore],
                         function(error, txn, store) {
              if (error) {
                return;
              }
              store.put(group).onsuccess = function() {
                waitForAsyncCall--;
                onContactsUpdated();
              };
            });
          } else {
            waitForAsyncCall--;
            onContactsUpdated();
          }
        });
        cursor.continue();
      };
      req.onerror = function onerror(event) {
        self._asyncReturn(callback, event.target.error.name);
      };
    });
  }
};
