'use strict';

var MockDatastore = {
  readOnly: false,
  revisionId: '123456',
  name: 'Mock_Datastore',

  _records: Object.create(null),
  _nextId: 1,
  _inError: false,
  _cb: null,

  _clone: function(obj) {
    var out = null;

    if (obj) {
      out = JSON.parse(JSON.stringify(obj));
    }
    return out;
  },

  _reject: function(errorName) {
    return new window.Promise(function(resolve, reject) {
      reject({
        name: errorName || 'UnknownError'
      });
    });
  },

  get: function(dsId) {
    if (this._inError === true) {
      return this._reject();
    }

    var record = this._clone(this._records[dsId]);
    return new window.Promise(function(resolve, reject) {
      resolve(record);
    });
  },

  put: function(obj, dsId) {
    if (this._inError === true) {
      return this._reject();
    }

    this._records[dsId] = this._clone(obj);
    var self = this;
    return new window.Promise(function(resolve, reject) {
      resolve();
      self._cb && self._cb({
        operation: 'updated',
        id: dsId
      });
    });
  },

  add: function(obj, dsId) {
    if (this._inError === true) {
      return this._reject();
    }

    var newId = dsId || this._nextId;
    this._nextId++;
    if (typeof this._records[newId] !== 'undefined') {
      return this._reject('ConstraintError');
    }
    this._records[newId] = this._clone(obj);
    var self = this;
    return new window.Promise(function(resolve, reject) {
      resolve(newId);
      self._cb && self._cb({
        operation: 'added',
        id: newId
      });
    });
  },

  remove: function(dsId) {
    if (this._inError === true) {
      return this._reject();
    }

    delete this._records[dsId];
    return new window.Promise(function(resolve, reject) {
      resolve(true);
    });
  },

  getLength: function() {
    if (this._inError === true) {
      return this._reject();
    }

    var total = Object.keys(this._records).length;
    return new window.Promise(function(resolve, reject) {
      resolve(total);
    });
  },

  clear: function() {
    if (this._inError === true) {
      return this._reject();
    }

    this._records = {};
    return new window.Promise(function(resolve, reject) {
      resolve();
    });
  },

  addEventListener: function(type, cb) {
    if (type === 'change') {
      this._cb = cb;
    }
  }
};

var MockNavigatorDatastore = {
  getDataStores: function() {
    if (MockNavigatorDatastore._notFound === true) {
      return new window.Promise(function(resolve, reject) {
        resolve([]);
      });
    }

    return new window.Promise(function(resolve, reject) {
      resolve([MockDatastore]);
    });
  }
};
