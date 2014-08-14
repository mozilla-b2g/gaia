'use strict';

/* global MockEventTarget */

/**
 * This file implement a set of nearly empty functions for you to
 * spy/stub on top of it. The native constructors are in fact exposed
 * (try console.log(IDBFactory) for example), but stub these native
 * objects or object prototypes might be to troublesome for writing
 * tests, hence the mock.
 *
 * This file requires MockEventTarget.
 *
 * These constructors contains methods from the formal spec:
 * http://www.w3.org/TR/IndexedDB/
 *
 * You may also find Gecko implementation here:
 * http://dxr.mozilla.org/mozilla-central/source/dom/indexedDB/
 * and it's WebIDL files in:
 * http://dxr.mozilla.org/mozilla-central/source/dom/webidl/
 *
 * Since window.indexedDB is not overwritable in Gecko,
 * we would have to overwrite the methods instead.
 *
 * To use the mock, do this in your setup():
 *
 *  var stubIndexedDB = this.sinon.stub(new MockIDBFactory());
 *  MockIDBFactory.attachToWindow(stubIndexedDB);
 *
 * In the test(), do this after the code to test to, for example, respond to
 * database open request:
 *
 * var req = stubIndexedDB.open.firstCall.returnValue;
 * var stubIDB = req.result = this.sinon.stub(new MockIDBDatabase(dbOptions));
 * req.dispatchEvent({
 *   type: 'success',
 *   target: req
 * });
 *
 */
//(function(exports) {

var MockIDBRequest = function(mOptions) {
  this.transaction = mOptions.transaction;
  this.source = mOptions.store;
  this.readyState = 'pending';
};
MockIDBRequest.prototype = Object.create(MockEventTarget.prototype);
MockIDBRequest.prototype.result = null;
MockIDBRequest.prototype.error = null;
MockIDBRequest.prototype.source = null;
MockIDBRequest.prototype.transaction = null;
MockIDBRequest.prototype.readyState = null;
MockIDBRequest.prototype.onsuccess = null;
MockIDBRequest.prototype.onerror = null;

var MockIDBOpenDBRequest = function() {
};
MockIDBOpenDBRequest.prototype = Object.create(MockIDBRequest.prototype);
MockIDBOpenDBRequest.prototype.onblocked = null;
MockIDBOpenDBRequest.prototype.onupgradeneeded = null;

var MockIDBObjectStore = function(mOptions) {
  this.name = mOptions.name;
  this.keyPath = mOptions.keyPath;
  this.indexNames = mOptions.indexNames;
  this.transaction = mOptions.transaction;
  this.autoIncrement = mOptions.autoIncrement || false;
};
MockIDBObjectStore.prototype.name = null;
MockIDBObjectStore.prototype.keyPath = null;
MockIDBObjectStore.prototype.indexNames = null;
MockIDBObjectStore.prototype.transaction = null;
MockIDBObjectStore.prototype.autoIncrement = false;
MockIDBObjectStore.prototype.put = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.add = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.delete = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.get = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.clear = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.openCursor = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.createIndex = function() {
  throw new Error('Not implemented');
};
MockIDBObjectStore.prototype.index = function() {
  throw new Error('Not implemented');
};
MockIDBObjectStore.prototype.deleteIndex = function() {
  // void
};
MockIDBObjectStore.prototype.count = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};
MockIDBObjectStore.prototype.mozGetAll = function() {
  return new MockIDBRequest({
    transaction: this.transaction,
    store: this
  });
};

var MockIDBTransaction = function(mOptions) {
  this.db = mOptions.db;
  this.mode = mOptions.mode || 'readonly';
  this.objectStoreNames = mOptions.objectStoreNames;
};
MockIDBTransaction.prototype = new MockEventTarget();
MockIDBTransaction.prototype.mode = null;
MockIDBTransaction.prototype.db = null;
MockIDBTransaction.prototype.error = null;
MockIDBTransaction.prototype.onabort = null;
MockIDBTransaction.prototype.oncomplete = null;
MockIDBTransaction.prototype.onerror = null;
MockIDBTransaction.prototype.objectStoreNames = null;
MockIDBTransaction.prototype.objectStore = function(name) {
  var mOptions = {
    name: name,
    transaction: this
  };

  if (name in this.db._objectStoreOptions) {
    mOptions.keyPath = this.db._objectStoreOptions[name].keyPath;
    mOptions.autoIncrement = this.db._objectStoreOptions[name].autoIncrement;
    mOptions.indexNames = this.db._objectStoreOptions[name].indexNames;
  }

  return new MockIDBObjectStore(mOptions);
};
MockIDBTransaction.prototype.abort = function() {
  // void
};

var MockIDBDatabase = function(mOptions) {
  this.name = mOptions.name;
  this.version = mOptions.version || 1;

  this._objectStoreOptions = mOptions._objectStoreOptions || {};
  this.objectStoreNames = mOptions.objectStoreNames;
};
MockIDBDatabase.prototype = new MockEventTarget();
MockIDBDatabase.prototype.name = null;
MockIDBDatabase.prototype.version = 0;
MockIDBDatabase.prototype.objectStoreNames = null;
MockIDBDatabase.prototype.onabort = null;
MockIDBDatabase.prototype.onerror = null;
MockIDBDatabase.prototype.onversionchange = null;
MockIDBDatabase.prototype.createObjectStore = function(name, params) {
  return new MockIDBObjectStore({
    name: name,
    keyPath: params ? (params.keyPath || null) : null,
    autoIncrement: params ? (params.autoIncrement || false) : false
  });
};
MockIDBDatabase.prototype.deleteObjectStore = function(name) {
  // void
};
MockIDBDatabase.prototype.transaction = function(storeNames, mode) {
  return new MockIDBTransaction({
    db: this,
    objectStoreNames: storeNames,
    mode: mode
  });
};
MockIDBDatabase.prototype.close = function() {
  // void
};
MockIDBDatabase.prototype.mozCreateFileHandle = function() {
  throw new Error('Not implemented');
};

var MockIDBFactory = function() {
};

MockIDBFactory.attachToWindow = function(instance) {
  if (!instance) {
    instance = new this();
  }

  window.indexedDB._open = window.indexedDB.open;
  window.indexedDB.open = instance.open.bind(instance);
  window.indexedDB._cmp = window.indexedDB.cmp;
  window.indexedDB.cmp = instance.cmp.bind(instance);
  window.indexedDB._deleteDatabase = window.indexedDB.deleteDatabase;
  window.indexedDB.deleteDatabase = instance.deleteDatabase.bind(instance);
};

MockIDBFactory.restore = function() {
  window.indexedDB.open = window.indexedDB._open;
  window.indexedDB.cmp = window.indexedDB._cmp;
  window.indexedDB.deleteDatabase = window.indexedDB._deleteDatabase;
};

MockIDBFactory.prototype.cmp = function(first, second) {
  // Should return a short number according to
  // http://www.w3.org/TR/IndexedDB/
  // #widl-IDBFactory-cmp-short-any-first-any-second
};
MockIDBFactory.prototype.open = function(name, version) {
  // This DOMRequest should return a MockIDBDatabase instance.
  return new MockIDBOpenDBRequest();
};
MockIDBFactory.prototype.deleteDatabase = function(name) {
  return new MockIDBOpenDBRequest();
};

/*
exports.MockIDBFactory = MockIDBFactory;
exports.MockIDBOpenDBRequest = MockIDBOpenDBRequest;
exports.MockIDBDatabase = MockIDBDatabase;
exports.MockIDBObjectStore = MockIDBObjectStore;
exports.MockIDBTransaction = MockIDBTransaction;
exports.MockIDBRequest = MockIDBRequest;

})(window);
*/
