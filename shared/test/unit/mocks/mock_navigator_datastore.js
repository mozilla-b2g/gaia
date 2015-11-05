'use strict';
/* exports MockDatastore, MockDatastoreObj */

function MockDatastoreObj(name, owner, records) {
  this.name = name || 'Mock_Datastore';
  this.owner = owner;
  this._records = records || Object.create(null);
}

MockDatastoreObj.prototype = {
  readOnly: false,
  revisionId: '123456',

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

  get: function() {
    if (this._inError === true) {
      return this._reject();
    }

    var self = this;
    var funcArgs = arguments;

    return new window.Promise(function(resolve, reject) {
      var dsIds;
      var args = [];
      for (var j = 0; j < funcArgs.length; j++) {
        args.push(funcArgs[j]);
      }

      if (args.length === 1) {
        dsIds = Array.isArray(args[0]) ? args[0] : [args[0]];
      } else {
        dsIds = args;
      }

      var results = [];

      dsIds.forEach(function(aId) {
        var record = self._clone(self._records[aId]);
        results.push(record);
      });

      var out = args.length > 1 ? results : results[0];

      resolve(out);
    });
  },

  put: function(obj, dsId) {
    if (this._inError === true) {
      return this._reject();
    }

    if (dsId === this._nextId) {
      this._nextId++;
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

  sync: function(revisionId) {
    return {
      next: () => {
        if (!this._tasks[this._taskCounter]) {
          this._taskCounter = 0;
        }

        return Promise.resolve(this._tasks[this._taskCounter++]);
      }
    };
  },

  _taskCounter: 0,
  // Please make sure there is always a 'done' task at the end.
  _tasks: [
    {
      operation: 'update',
      id: 0,
      data: {}
    },
    {
      operation: 'done',
      id: 0,
      data: null
    }
  ],

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
    this._nextId = 1;

    return new window.Promise(function(resolve, reject) {
      resolve();
    });
  },

  addEventListener: function(type, cb) {
    if (type === 'change') {
      this._cb = cb;
    }
  },

  removeEventListener: function() {
    this._cb = null;
  }
};

var MockDatastore = new MockDatastoreObj();

var MockNavigatorDatastore = {
  _datastores: null,

  getDataStores: function() {
    if (MockNavigatorDatastore._notFound === true) {
      return new window.Promise(function(resolve, reject) {
        resolve([]);
      });
    }

    return new window.Promise(function(resolve, reject) {
      if (!MockNavigatorDatastore._datastores) {
        resolve([MockDatastore]);
      } else {
        resolve(MockNavigatorDatastore._datastores);
      }
    });
  }
};
