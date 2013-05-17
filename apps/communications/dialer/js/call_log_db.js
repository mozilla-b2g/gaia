'use strict';

var CallLogDBManager = {
  _db: null,
  _dbName: 'dialerRecents',
  _dbRecentsStore: 'dialerRecents',
  _dbGroupsStore: 'dialerGroups',
  _dbVersion: 3,

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
  _ensureDB: function rdbm_ensureDB(callback) {
    if (this._db) {
      callback(null, this._db);
      return;
    }

    try {
      var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                      window.mozIndexedDB || window.msIndexedDB;
      if (!indexedDB) {
        callback('NO_INDEXED_DB_AVAILABLE', null);
        return;
      }

      var request = indexedDB.open(this._dbName, this._dbVersion);
      request.onsuccess = (function(event) {
        this._db = event.target.result;
        callback(null, this._db);
      }).bind(this);

      request.onerror = function(event) {
        callback(event.target.errorCode, null);
      };

      request.onblocked = function() {
        callback('DB_REQUEST_BLOCKED', null);
      };

      request.onupgradeneeded = (function(event) {
        var db = event.target.result;
        var txn = event.target.transaction;
        var currentVersion = event.oldVersion;
        while (currentVersion != event.newVersion) {
          switch (currentVersion) {
            case 0:
              this._createSchema(db);
              break;
            case 1:
              this._upgradeSchemaVersion2(db, txn);
              break;
            case 2:
              this._upgradeSchemaVersion3(db, txn);
              break;
            default:
              event.target.transaction.abort();
              break;
          }
          currentVersion++;
        }
      }).bind(this);
    } catch (ex) {
      callback(ex.message, null);
    }
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
  _newTxn: function rdbm_newTxn(txnType, objectStores, callback) {
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
  _createSchema: function rdbm_createSchema(db) {
    // The object store hosting the recents calls will contain entries like:
    // { date: <Date> (primary key),
    //   number: <String>,
    //   type: <String>,
    //   groupId: <Number> }
    var objStore = db.createObjectStore(this._dbRecentsStore,
                                        { keyPath: 'date' });
    objStore.createIndex('number', 'number');
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
  _upgradeSchemaVersion2: function upgradeSchemaVersion2(db, transaction) {
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
  },
  /**
   * Upgrade schema to version 3. Recreate the object store to host groups of
   * calls with a new schema changing the old string primary key for an array
   * which will contain the date of the first call of the group, the phone
   * number associated with the call, the type of the call (incoming, dialing)
   * and the status of the call (accepted or not). We also need to remove the
   * unused 'contact' field and add a new 'lastEntryDate' field containing the
   * date of the last call of the group.
   *
   * param db
   *        Database instance.
   * param transaction
   *        IDB transaction instance.
   */
  _upgradeSchemaVersion3: function rdbm_upgradeSchemaVersion3(db, transaction) {
    // First of all, we delete the old groups object store.
    db.deleteObjectStore(this._dbGroupsStore);

    // We recreate the object store that can be used to quickly construct a
    // group view of the recent calls database. Each entry looks like this:
    //
    // { id: [date<Date>, number<String>, type<String>, status<String>]
    //   lastEntryDate: <Date>,
    //   retryCount: <Number> }
    //
    //  The <Date> value from the 'id' field contains only the day of the call.
    //
    //  'lastEntryDate' contains a full date.
    //
    //  'retryCount' is incremented when we store a new call.
    var groupsStore = db.createObjectStore(this._dbGroupsStore,
                                           { keyPath: 'id' });
    groupsStore.createIndex('lastEntryDate', 'lastEntryDate');

    var recentsStore = transaction.objectStore(this._dbRecentsStore);
    // Populate quick groups view with already existing calls.
    var groups = {};
    recentsStore.openCursor().onsuccess = (function(event) {
      var cursor = event.target.result;
      if (!cursor) {
        for (var group in groups) {
          groupsStore.put(groups[group]);
        }
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
      var id = this._getGroupId({
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

      // Store the group or increment the 'retryCount' field if we already
      // created a group for this call.
      if (key in groups) {
        groups[key].retryCount++;
      } else {
        groups[key] = {
          id: id,
          lastEntryDate: this._getDayDate(record.date),
          retryCount: record.retryCount
        };
      }

      // Update the call with the generated groupId.
      record.groupId = id;
      recentsStore.put(record);
      cursor.continue();
    }).bind(this);
  },
  /**
   * Helper function to get the day date from a full date.
   */
  _getDayDate: function rdbm_getDayDate(timestamp) {
    var date = new Date(timestamp),
        startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },
  /**
   * Helper function to get the group ID from a recent call object.
   */
  _getGroupId: function rdbm_getGroupId(recentCall) {
    var groupId = [this._getDayDate(recentCall.date),
                   recentCall.number, recentCall.type];
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
   *   lastEntryDate: <Date>,
   *   retryCount: <Number> }
   *
   * but consumers might find this format hard to handle, so we unwrap the
   * data inside the 'id' field to create a more manageable object of this
   * form:
   *
   * {
   *   id: <String>,
   *   date: <Date>,
   *   number: <String>,
   *   type: <String>,
   *   status: <String>,
   *   lastEntryDate: <Date>,
   *   retryCount: <Number> }
   */
  _getGroupObject: function rdbm_getGroupObject(group) {
    if (!Array.isArray(group.id) || group.id.length < 3) {
      return null;
    }

    return {
      id: group.id.join('-'),
      date: group.id[0],
      number: group.id[1],
      type: group.id[2],
      status: group.id[3] || undefined,
      lastEntryDate: group.lastEntryDate,
      retryCount: group.retryCount
    };
  },
  /**
   * Stores a new call in the database.
   *
   * param recentCall
   *        Object representing the new call to be stored with this form:
   *        { number: <String>,
   *          type: <String>,
   *          status: <String>,
   *          date: <Date> }
   *
   * param callback
   *        Function to be called when the transaction is done.
   *
   * return (via callback) the object representing the group where the call
   *                       belongs to or an error message if needed.
   */
  add: function rdbm_add(recentCall, callback) {
    if (typeof recentCall !== 'object') {
      callback('INVALID_CALL');
      return;
    }

    var self = this;
    this._newTxn('readwrite', [this._dbRecentsStore, this._dbGroupsStore],
                 function(error, txn, stores) {
      if (error) {
        if (callback && callback instanceof Function) {
          callback(error);
        }
        return;
      }

      var recentsStore = stores[0];
      var groupsStore = stores[1];

      var groupId = self._getGroupId(recentCall);

      // For adding a call to the database we first create or update its
      // corresponding group and then we store the actual call adding the id
      // of the group where it belongs.
      groupsStore.get(groupId).onsuccess = function() {
        var group = this.result;
        if (group) {
          // Groups should have the date of the newest call.
          if (group.lastEntryDate <= recentCall.date) {
            group.lastEntryDate = recentCall.date;
          }
          group.retryCount++;
          groupsStore.put(group);
        } else {
          group = {
            id: groupId,
            lastEntryDate: recentCall.date,
            retryCount: 1
          };
          groupsStore.add(group);
        }
        recentCall.groupId = groupId;
        recentsStore.put(recentCall).onsuccess = function() {
          if (callback && callback instanceof Function) {
            callback(self._getGroupObject(group));
          }
        };
      };
    });
  },
  /**
   * Delete a group of calls and all the calls belonging to that group.
   *
   * param group
   *        Group object to be deleted.
   *
   * return (via callback) count of deleted calls or error if needed.
   */
  deleteGroup: function rdbm_deleteGroup(group, callback) {
    if (!group || typeof group !== 'object' || !group.date || !group.number ||
        !group.type) {
      callback('NOT_VALID_GROUP');
      return;
    }

    this._newTxn('readwrite', [this._dbGroupsStore, this._dbRecentsStore],
                 (function(error, txn, stores) {
      if (error) {
        if (callback && callback instanceof Function) {
          callback(error);
        }
        return;
      }

      var groupsStore = stores[0];
      var recentsStore = stores[1];

      var groupId = this._getGroupId(group);

      // We delete the given group and all its corresponding calls.
      groupsStore.delete(groupId).onsuccess = function() {
        var deleted = 0;
        recentsStore.index('groupId').openCursor(groupId)
                    .onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            if (callback && callback instanceof Function) {
              callback(deleted);
            }
          }
        };
      };
    }).bind(this));
  },
  /**
   * Delete a list of groups of calls and all its belonging calls.
   *
   * param groupList
   *        Array of group objects to be deleted.
   *
   * return (via callback) count of deleted calls or an error message if
   *                       needed.
   */
  deleteGroupList: function rdbm_deleteGroupList(groupList, callback) {
    var deleted = 0;
    if (groupList.length > 0) {
      var itemToDelete = groupList.pop();
      if (typeof itemToDelete !== 'object') {
        callback('INVALID_GROUP_IN_LIST');
        return;
      }
      this.deleteGroup(itemToDelete, (function(result) {
        // We expect a number. Otherwise that means that we got an error
        // message.
        if (typeof result !== 'number') {
          if (callback && callback instanceof Function) {
            callback(result);
          }
          return;
        }
        deleted += result;
        this.deleteGroupList(groupList, callback);
      }).bind(this));
    } else {
      if (callback && callback instanceof Function) {
        callback(deleted);
      }
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
  deleteAll: function rdbm_deleteAll(callback) {
    this._newTxn('readwrite', [this._dbRecentsStore, this._dbGroupsStore],
                 (function(error, txn, stores) {
      if (error) {
        if (callback instanceof Function) {
          callback(error);
        }
        return;
      }

      var recentsStore = stores[0];
      var groupsStore = stores[1];

      recentsStore.clear().onsuccess = function() {
        groupsStore.clear().onsuccess = function() {
          if (callback && callback instanceof Function) {
            callback();
          }
        };
      };
    }).bind(this));
  },
  /**
   * Delete the storaged database file.
   *
   * param callback
   *        Function to be called after the deletion of the database.
   */
  deleteDb: function rdbm_deleteDb(callback) {
    var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                    window.mozIndexedDB || window.msIndexedDB;
    if (!indexedDB) {
      callback('NO_INDEXEDDB_AVAILABLE');
      return;
    }
    indexedDB.deleteDatabase(this._dbName, this._dbVersion)
             .onsuccess = function() {
      if (callback) {
        callback();
      }
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
  _getList: function rdbm_getList(storeName, callback, sortedBy, prev,
                                  getCursor, limit) {
    var self = this;
    this._newTxn('readonly', [storeName], function(error, txn, store) {
      if (error) {
        if (callback && callback instanceof Function) {
          callback(error);
        }
        return;
      }

      var cursor = null;
      var direction = prev ? 'prev' : 'next';
      if (sortedBy && sortedBy !== null) {
        cursor = store.index(sortedBy).openCursor(null, direction);
      } else {
        cursor = store.openCursor(null, direction);
      }
      var result = [];
      cursor.onsuccess = function(event) {
        var item = event.target.result;

        if (item && getCursor) {
          if (callback && callback instanceof Function) {
            if (storeName === self._dbGroupsStore) {
              callback({
                value: self._getGroupObject(item.value),
                continue: function() { return item.continue(); }
              });
            } else {
              callback(item);
            }
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
          if (callback && callback instanceof Function) {
            callback(result);
          }
        }
      };
      cursor.onerror = function(event) {
        if (callback && callback instanceof Function) {
          callback(e.target.error.name);
        }
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
  getRecentList: function rdbm_getRecentList(callback, sortedBy, prev,
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
  getGroupList: function rdbm_getGroupList(callback, sortedBy, prev,
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
   * Get the group with the most recent date.
   *
   * param callback
   *        Function to be called with the last group or an error message if
   *        needed.
   * param sortedBy
   *        Field to sort by.
   *
   * return (via callback) the last group or an error message if needed.
   */
  getLastGroup: function rdbm_getLastGroup(callback, sortedBy) {
    var self = this;
    this._newTxn('readonly', this._dbGroupsStore,
                 function(error, txn, store) {
      if (error) {
        if (callback && callback instanceof Function) {
          callback(error);
        }
        return;
      }

      try {
        var request = null;
        if (sortedBy && sortedBy !== null) {
          request = store.index(sortedBy).openCursor(null, 'prev');
        } else {
          request = store.openCursor(null, 'prev');
        }
        request.onsuccess = function(event) {
          if (callback && callback instanceof Function) {
            var result = event.target.result;
            if (result) {
              callback(self._getGroupObject(result.value));
            } else {
              callback(null);
            }
          }
        };
        request.onerror = function(event) {
          if (callback && callback instanceof Function) {
            callback(event.target.error.name);
          }
        };
      } catch (e) {
        if (callback && callback instanceof Function) {
          callback(e);
        }
      }
    });
  },

  //**************************************************************************
  // TODO: This methods are only kept as a temporary meassure for not breaking
  //       the call log until bug 847406 lands.
  //**************************************************************************

  init: function DELETEMEPLEASE_init(callback) {
    callback();
  },
  get: function DELETEMEPLEASE_get(callback) {
    this.getRecentList(callback, null, true);
  },
  delete: function DELETEMEPLEASE_delete(date, callback) {
    var self = this;
    this._newTxn('readwrite', [this._dbRecentsStore],
                 function(error, txn, store) {
      var delRequest = store.delete(date);

      delRequest.onsuccess = function de_onsuccess() {
        if (callback && callback instanceof Function) {
          callback();
        }
      };

      delRequest.onerror = function de_onsuccess(e) {
        console.log('recents_db delete item failure: ',
            e.message, delRequest.errorCode);
      };
    });
  },
  deleteList: function DELETEMEPLEASE_deleteList(list, callback) {
    if (list.length > 0) {
      var itemToDelete = list.pop();
      var self = this;
      this.delete(itemToDelete, function() {
        self.deleteList(list, callback);
      });
    } else {
      if (callback) {
        callback();
      }
    }
  },
  getLast: function DELETEMEPLEASE_getLast(callback) {
    this._newTxn('readonly', [this._dbRecentsStore],
                 function(error, txn, store) {
      var cursor = store.openCursor(null, 'prev');
      cursor.onsuccess = function(event) {
        var item = event.target.result;
        if (item) {
          callback(item.value);
        }
      };

      cursor.onerror = function(e) {
        console.log('recents_db get failure: ', e.message);
      };
    });
  }
};
