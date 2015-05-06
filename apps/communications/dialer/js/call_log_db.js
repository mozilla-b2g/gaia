'use strict';

/* exported CallLogDBManager */

/*global ContactPhotoHelper, Contacts, IDBKeyRange, LazyLoader, Utils */

var CallLogDBManager = {
  _db: null,
  _dbName: 'dialerRecents',
  _dbRecentsStore: 'dialerRecents',
  _dbGroupsStore: 'dialerGroups',
  _dbVersion: 6,
  _maxNumberOfGroups: 200,
  _numberOfGroupsToDelete: 30,

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

    LazyLoader.load(['/shared/js/dialer/utils.js',
                     '/shared/js/dialer/contacts.js'], (function() {
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
                self._upgradeSchemaVersion6(db, txn, next);
                break;
              case 6:
                // we have finished the upgrades. please keep this
                // in sync for future upgrades, since otherwise it
                // will call the default: and abort the transaction :(
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
   * calls.
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
    db.createObjectStore(this._dbGroupsStore,
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

    var groupsStore = transaction.objectStore(this._dbGroupsStore);

    // We create indexes for 'contact-id', 'number' and 'lastEntryDate'
    // as we will be searching by number, contact and date.
    // Unfortunately, even if we have the number data in the group id field, we
    // can't search for [*, "exact number match", *, *], so we need a new
    // 'number' index.
    groupsStore.createIndex('number', 'number');
    groupsStore.createIndex('contactId', 'contactId');
    groupsStore.createIndex('lastEntryDate', 'lastEntryDate');

    next();
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
   * Remove the `dialerRecents' store as it's not used anymore.
   */
  _upgradeSchemaVersion6:
    function upgradeSchemaVersion6(db, transaction, next) {
    // Remove the unused dialerRecents store
    db.deleteObjectStore(this._dbRecentsStore);

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
   *   serviceId: <String>,
   *   lastEntryDate: <Date>,
   *   retryCount: <Number>,
   *   contactId: <String>,
   *   contactPrimaryInfo: <String>,
   *   contactMatchingTelType: <String>,
   *   contactMatchingTelCarrier: <String>,
   *   contactPhoto: <Blob>,
   *   emergency: <Bool>,
   *   voicemail: <Bool>,
   *   calls: [
   *     {date: <Date>, duration: <Number>}
   *   ]
   * }
   *
   * but consumers might find this format hard to handle, so we unwrap the
   * data inside the 'id' and contact related fields to create a more
   * manageable object of this form:
   *
   * {
   *   id: <String>,
   *   date: <Date>, <!-- new -->
   *   type: <String>, <!-- new -->
   *   status: <String>, <!-- new -->
   *   number: <String>,
   *   serviceId: <String>,
   *   lastEntryDate: <Date>,
   *   retryCount: <Number>,
   *   contact: { <!-- new -->
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
   *   calls: [
   *     {date: <Date>, duration: <Number>}, more recent first
   *     ...
   *   ]
   * }
   * The <Date> value from the 'id' field contains only the day of the call.
   *
   * 'lastEntryDate' contains a full date.
   *
   * 'retryCount' is incremented when we store a new call.
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
      serviceId: group.serviceId,
      type: group.id[2],
      status: group.id[3] || undefined,
      lastEntryDate: group.lastEntryDate,
      retryCount: group.retryCount,
      contact: contact,
      emergency: group.emergency,
      // bug 1078663: The voicemail field was polluted with withheld numbers
      // being registered as voicemail numbers. To get around this, we check if
      // there is a number as well as the voicemail flag being set.
      voicemail: !!(group.id[1] && group.voicemail),
      calls: group.calls
    };
  },
  /**
   * Ensures that the DB size is not bigger than _maxNumberOfGroups. If the DB
   * is fat enough, we delete the number of groups higher than
   * _maxNumberOfGroups (most likely 1) plus _numberOfGroupsToDelete to make
   * some extra space.
   */
  _keepDbPrettyAndFit: function _keepDbPrettyAndFit(txn, callback) {
    var self = this;
    var store = txn.objectStore(this._dbGroupsStore);
    var req = store.count();

    req.onsuccess = function() {
      var groupsToDelete = req.result - self._maxNumberOfGroups;

      if (groupsToDelete > 0) {
        groupsToDelete += self._numberOfGroupsToDelete;

        var cursorReq = store.index('lastEntryDate').openCursor();
        cursorReq.onsuccess = function() {
          var cursor = cursorReq.result;

          if (!cursor || !groupsToDelete) {
            return;
          }
          groupsToDelete--;
          self.deleteGroup(null, cursor.value.id);
          cursor.continue();
        };
      }
    };

    txn.oncomplete = function() {
      if (callback && callback instanceof Function) {
        callback();
      }
    };
  },
  /**
   * Stores a new call in the database.
   *
   * param recentCall
   *        Object representing the new call to be stored with this form:
   *        { number: <String>,
   *          serviceId: <String>,
   *          type: <String>,
   *          status: <String>,
   *          date: <Date>,
   *          emergency: <Bool>,
   *          voicemail: <Bool>,
   *          duration: <Number> }
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
    this._newTxn('readwrite', this._dbGroupsStore,
                 function(error, txn, groupsStore) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      var groupId = self._getGroupId(recentCall);

      // For adding a call to the database we first create or update its
      // corresponding group and then we store the actual call adding the id
      // of the group where it belongs.
      groupsStore.get(groupId).onsuccess = function onsuccess() {
        var group = this.result;
        if (group) {
          self._updateExistingGroup(group, recentCall, txn, callback);
        } else {
          // When creating a new group we don't reuse the outer transaction for
          // accessing the database as we need to do further asynchronous
          // operations that would make it commit before we get a chance to
          // use it again.
          self._createNewGroup(groupId, recentCall, callback);
        }
      };
    });
  },

  _updateExistingGroup: function(group, recentCall, txn, callback) {
    var groupsStore = txn.objectStore(this._dbGroupsStore);
    var groupObject;
    var self = this;

    txn.oncomplete = function() {
      self._dispatchCallLogDbNewCall(groupObject);
      self._asyncReturn(callback, groupObject);
    };

    // Groups should have the date of the newest call.
    if (group.lastEntryDate <= recentCall.date) {
      group.lastEntryDate = recentCall.date;
      group.serviceId = recentCall.serviceId;
      group.emergency = recentCall.emergency;
      group.voicemail = recentCall.voicemail;
    }

    group.calls = group.calls || [];
    group.calls.unshift({date: recentCall.date, duration: recentCall.duration});

    group.retryCount++;
    groupsStore.put(group).onsuccess = function onsuccess() {
      groupObject = self._getGroupObject(group);
    };
  },

  _createNewGroup: function(groupId, recentCall, callback) {
    var self = this;

    var group = {
      id: groupId,
      number: recentCall.number,
      serviceId: recentCall.serviceId,
      lastEntryDate: recentCall.date,
      retryCount: 1,
      emergency: recentCall.emergency,
      voicemail: recentCall.voicemail,
      calls: [{date: recentCall.date, duration: recentCall.duration}]
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
        if (error) {
          self._asyncReturn(callback, error);
          return;
        }

        // We verify if the group was already added by another transaction
        // before trying to add it again.
        store.get(groupId).onsuccess = function onsuccess() {
          if (this.result) {
            return;
          }

          // For adding a call to the database we first create or update its
          // corresponding group and then we store the actual call adding the id
          // of the group where it belongs.
          store.add(group).onsuccess = function onsuccess() {
            var groupObject = self._getGroupObject(group);
            self._dispatchCallLogDbNewCall(groupObject);

            // Once the group has successfully been added, we check that the
            // db size is below the max size set.
            self._keepDbPrettyAndFit(txn, function() {
              self._asyncReturn(callback, groupObject);
            });
          };
        };
      });
    });
  },

  _dispatchCallLogDbNewCall: function(group) {
    var createOrUpdateEvt = new CustomEvent('CallLogDbNewCall',
      {detail: {group: group}});
    window.dispatchEvent(createOrUpdateEvt);
  },

  /**
   * Delete a group of calls and all the calls belonging to that group.
   *
   * param group
   *        Group object to be deleted.
   * param groupId
   *        Identifier of the group to be deleted. We expect a group object or
   *        its identifier.
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

    this._newTxn('readwrite', this._dbGroupsStore,
                 function(error, txn, groupsStore) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      if (!groupId) {
        groupId = self._getGroupId(group);
      }

      txn.oncomplete = function() {
        self._asyncReturn(callback);
      };

      // We delete the given group.
      groupsStore.delete(groupId);
    });
  },
  /**
   * Delete a list of groups of calls and all its belonging calls.
   *
   * param groupList
   *        Array of group objects to be deleted.
   */
  deleteGroupList: function deleteGroupList(groupList, callback) {
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
        if (result) {
          self._asyncReturn(callback, result);
          return;
        }

        self.deleteGroupList(groupList, callback);
      };

      self.deleteGroup(itemToDelete, null, ondeleted);
    } else {
      self._asyncReturn(callback);
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
    this._newTxn('readwrite', this._dbGroupsStore,
                 function(error, txn, groupsStore) {
      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      txn.oncomplete = function() {
        self._asyncReturn(callback);
      };

      groupsStore.clear();
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
   *        error is caught.
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
    var results = [];

    if (!callback || !(callback instanceof Function)) {
      return;
    }

    var self = this;
    this._newTxn('readonly', [storeName], function(error, txn, store) {
      if (error) {
        callback(error);
        return;
      }

      if (!getCursor) {
        txn.oncomplete = function() {
          callback(results);
        };
      }

      txn.onerror = function(event) {
        callback(event.target.error);
      };

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

      cursor.onsuccess = function onsuccess(event) {
        var item = event.target.result;

        if (getCursor) {
          if (!item) {
            callback({ value: null });
          } else if (storeName === self._dbGroupsStore) {
            callback({
              value: self._getGroupObject(item.value),
              continue: function() { return item.continue(); }
            });
          } else {
            callback(item);
          }
          return;
        } else if (item && (typeof limit === 'undefined' || limit > 0)) {
          if (storeName === self._dbGroupsStore) {
            results.push(self._getGroupObject(item.value));
          } else {
            results.push(item.value);
          }
          if (limit) {
            limit--;
          }
          item.continue();
        }
      };
    });
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
    if (!callback || !(callback instanceof Function)) {
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

  getGroup: function(number, date, type, status) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var recentCall = {number: number, date: date, type: type, status: status};
      var groupId = self._getGroupId(recentCall);
      self._newTxn('readonly', self._dbGroupsStore,
      function(error, txn, groupsStore) {
        var group = null;

        txn.oncomplete = function() {
          if (group) {
            resolve(self._getGroupObject(group));
          } else {
            reject();
          }
        };

        groupsStore.get(groupId).onsuccess = function() {
          group = this.result;
        };
      });
    });
  },

  /**
   * We store a revision number for the contacts data local cache that we need
   * to keep synced with the Contacts API database.
   * This method stores the revision of the Contacts API database and it will
   * be called after refresing the local cache because of a contact updated, a
   * contact deletion or a cache sync.
   *
   * @param {Function} callback A callback to be invoked when the operation is
   *        complete.
   */
  _updateCacheRevision: function _updateCacheRevision(callback) {
    Contacts.getRevision(function(contactsRevision) {
      if (contactsRevision) {
        window.asyncStorage.setItem('contactCacheRevision',
                                    contactsRevision);
      }
      callback();
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
      var result;

      if (error) {
        self._asyncReturn(callback, error);
        return;
      }

      if (!contact) {
        self._asyncReturn(callback, 0);
        return;
      }

      txn.oncomplete = function() {
        self._updateCacheRevision(function() {
          self._asyncReturn(callback, result);
        });
      };

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
          self._dispatchCallLogDbNewCall(self._getGroupObject(group));
          count++;
          cursor.continue();
        } else {
          result = count;
        }
      };
      req.onerror = function onerror(event) {
        result = event.target.error;
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
   * return (via callback) nothing or an error message if needed.
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

      txn.oncomplete = function() {
        self._updateCacheRevision(function() {
          self._asyncReturn(callback, count);
        });
      };
      txn.onerror = function(event) {
        self._asyncReturn(callback, event.target.error);
      };

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
          self._dispatchCallLogDbNewCall(self._getGroupObject(group));
          cursor.update(group);
          count++;
          cursor.continue();
        }
      };
    });
  },

  /**
   * Returns a promise that when fullfilled returns an array holding all the
   * groups in the call log.
   *
   * @return {Promise} A promise that is resolved to an array holding all the
   *                  groups in the call log.
   */
  _gatherAllGroups: function _gatherAllGroups() {
    var self = this;

    return new Promise(function(resolve, reject) {
      var groups = []; // Used to accumulate all call log groups

      /* Gather all the groups present in the call log and store them in an
       * array; the promise will be resolved using the said array. */
      self._newTxn('readonly', [self._dbGroupsStore],
                    function(error, txn, store) {
        if (error) {
          reject(error);
          return;
        }

        txn.oncomplete = function() {
          resolve(groups);
        };
        txn.onerror = function(event) {
          reject(event.target.error);
        };

        var req = store.openCursor();
        req.onsuccess = function onsuccess(event) {
          var cursor = event.target.result;
          if (!cursor) {
            return;
          }

          groups.push(cursor.value);
          cursor.continue();
        };
      });
    });
  },

  /**
   * Updates a group using the new contact information present in the contacts
   * database. Returns a promise that is fullfilled with the updated group. If
   * the group didn't need updating then the promise resolution will be null.
   *
   * @param {Object} group The group object to be updated.
   *
   * @return {Promise} A promise that is fullfilled with the updated group or
   *         null if no update was necessary.
   */
  _updateGroup: function _updateGroup(group) {
    return new Promise(function(resolve, reject) {
      Contacts.findByNumber(group.number,
      function update(contact, matchingTel) {
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

        // If the group does not need updating do not return it
        resolve(needsUpdate ? group : null);
      });
    });
  },

  invalidateContactsCache: function invalidateContactsCache(callback) {
    var self = this;

    this._gatherAllGroups().then(function(groups) {
      var promises = [];

      /* For each group gather the contact information and wheter or not it
       * needs to be updated. Each query will resolve to either the updated
       * group or null in case the group is up to date. */
      for (var i = 0; i < groups.length; i++) {
        promises.push(self._updateGroup(groups[i]));
      }

      return Promise.all(promises);
    }).then(function(updatedGroups) {
      /* Iterate over all groups and store those that have been updated. Once
       * this is done update the cache revision and invoke the user provided
       * callback to finish the procedure. */
      self._newTxn('readwrite', [self._dbGroupsStore],
                    function(error, txn, store) {
        if (error) {
          self._asyncReturn(callback, error);
          return;
        }

        txn.oncomplete = function onContactsUpdated() {
          self._updateCacheRevision(function() {
            self._asyncReturn(callback);
          });
        };
        txn.onerror = function(event) {
          self._asyncReturn(callback, event.target.error);
        };

        for (var i = 0; i < updatedGroups.length; i++) {
          if (updatedGroups[i]) {
            store.put(updatedGroups[i]);
          }
        }
      });
    });
  }
};
