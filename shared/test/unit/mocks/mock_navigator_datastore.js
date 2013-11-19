'use strict';

var MockNavigatorDatastore = {
  getDataStores: function() {
    return new window.Promise(function(resolve, reject) {
      resolve([MockDatastore]);
    });
  }
};

var MockDatastore = {
  readOnly: false,
  revisionId: '123456',
  name: 'Mock_Datastore',

  _records: Object.create(null),
  _nextId: 1,

  _clone: function(obj) {
    var out = null;

    if (obj) {
      out = JSON.parse(JSON.stringify(obj));
    }
    return out;
  },

  get: function(dsId) {
    var record = this._clone(this._records[dsId]);
    return new window.Promise(function(resolve, reject) {
      resolve(record);
    });
  },

  put: function(obj, dsId) {
    this._records[dsId] = this._clone(obj);
    return new window.Promise(function(resolve, reject) {
      resolve();
    });
  },

  add: function(obj, dsId) {
    var newId = this._nextId;
    this._nextId++;
    this._records[newId] = this._clone(obj);
    return new window.Promise(function(resolve, reject) {
      resolve(newId);
    });
  },

  remove: function(dsId) {
    delete this._records[dsId];
    return new window.Promise(function(resolve, reject) {
      resolve(true);
    });
  },

  getLength: function() {
    var total = Object.keys(this._records).length;
    return new window.Promise(function(resolve, reject) {
      resolve(total);
    });
  },

  clear: function() {
    this._records = {};
    return new window.Promise(function(resolve, reject) {
      resolve();
    });
  }
};
