'use strict';

// Sending failed message management: Add a database for the pending message
// which didn't send successfully.

var PendingMsgManager = {
  db: null,
  dbReady: false,
  dbName: 'Pending_DB',
  dbVersion: 1,
  dbError: function pm_dbError(errorMsg) {
    console.log('Pending Message Database Error : ' + errorMsg);
  },

  init: function pm_init(callback) {
    try {
      var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                      window.mozIndexedDB || window.msIndexedDB;
    } catch (e) {
      this.dbError(e);
      return;
    }

    if (!indexedDB) {
      this.dbError('Indexed DB is not available!!!');
      return;
    }

    try {
      var msgCallback = callback;
      var msgManager = this;
      var request = indexedDB.open(this.dbName, this.dbVersion);
      request.onsuccess = function(event) {
        msgManager.db = event.target.result;
        msgManager.dbReady = true;
        if (msgCallback != undefined) {
          msgCallback();
        }
      };

      request.onerror = function(event) {
        msgManager.dbError('Database error: ' + event.target.errorCode);
      };

      request.onupgradeneeded = function(event) {
        var db = event.target.result;
        var objStore = db.createObjectStore('msgs', { keyPath: 'id' });
        objStore.createIndex('receiver', 'receiver');
      };
    } catch (ex) {
      msgManager.dbError(ex.message);
    }
  },

  getMsgDB: function pm_getMsgDB(num, callback) {
    var store = this.db.transaction('msgs').objectStore('msgs');
    store = store.index('receiver'); // receiver number.
    var boundKeyRange = num ? IDBKeyRange.only(num) : null;
    var cursorRequest = store.openCursor(boundKeyRange, 'next');
    var msg = [];
    cursorRequest.onsuccess = function onsuccess() {
      var cursor = cursorRequest.result;
      if (!cursor) {
        callback(msg);
        return;
      }
      msg.push(cursor.value);
      cursor.continue();
    }
    cursorRequest.onerror = function onerror() {
      callback(null);
    }
  },

  saveToMsgDB: function pm_saveToMsgDB(msg, callback) {
    var transaction = this.db.transaction('msgs', 'readwrite');
    var store = transaction.objectStore('msgs');
    var addRequest = store.add(msg);
    var pendingMgr = this;
    addRequest.onsuccess = function onsuccess() {
      callback(addRequest.result);
    }
    addRequest.onerror = function onerror() {
      callback(null);
      // Execute save operation again if failed.
      window.setTimeout(
        pendingMgr.saveToMsgDB(msg, callback).bind(pendingMgr), 500);
    }
  },

  deleteFromMsgDB: function pm_deleteFromMsgDB(id, callback) {
    var transaction = this.db.transaction('msgs', 'readwrite');
    var store = transaction.objectStore('msgs');
    var deleteRequest = store.delete(id);
    var pendingMgr = this;
    deleteRequest.onsuccess = function onsuccess() {
      if (callback) {
        callback(deleteRequest);
      }

    }
    deleteRequest.onerror = function onerror() {
      if (callback) {
        callback(null);
      }
      // Execute save operation again if failed.
      window.setTimeout(
        pendingMgr.deleteFromMsgDB(id, callback).bind(pendingMgr), 500);
    }
  }
};
