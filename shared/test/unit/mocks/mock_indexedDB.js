'use strict';
/* global sinon */
/* exported MockIndexedDB */

function MockIndexedDB() {
  var dbs = [];
  var deletedDbs = [];
  this.options = {};
  this.storedDataDbs = {};

  var self = this;

  var nextId = 1;

  Object.defineProperty(this, 'dbs', {
    get: function() {
      return dbs;
    }
  });

  Object.defineProperty(this, 'deletedDbs', {
    get: function() {
      return deletedDbs;
    }
  });

  var FakeDB = function(name, storedData) {
    var dummyFunction = function(obj) {
      return obj;
    };

    this.receivedData = [];
    this.receivedDataHash = {};
    this.deletedData = [];
    this.storedData = storedData || {};
    this.options = {};

    var objectStore = {
      createIndex: dummyFunction
    };

    this.objectStoreNames = ['fakeObjStore'];
    this.createObjectStore = dummyFunction.bind(undefined,
                                                objectStore);

    this.deleteObjectStore = dummyFunction;
    this.transaction = sinon.stub();
    this.objectStore = sinon.stub();
    this.get = dummyFunction;
    this.put = dummyFunction;
    this.delete = dummyFunction;
    this.openCursor = dummyFunction;
    this.close = dummyFunction;
    this.clear = dummyFunction;
    this.index = dummyFunction;

    this.transaction.returns(this);
    this.objectStore.returns(this);

    var self = this;

    sinon.stub(this, 'index', function(indexName) {
      var data = self.storedData;

      if (self._indexedData && self._indexedData.by) {
        data = self._indexedData.by[indexName] || self.storedData;
      }
      return new FakeIndex(indexName, data, self.options);
    });

    sinon.stub(this, 'close', function() {
      self.isClosed = true;
    });

    sinon.stub(this, 'put', function(data) {
      data.id = data.id || nextId++;
      self.receivedDataHash[data.id] = data;
      self.receivedData.push(data);
      return _getRequest();
    });

    sinon.stub(this, 'get', function(key) {
      return _getRequest(self.storedData[key] || self.receivedDataHash[key]);
    });

    sinon.stub(this, 'openCursor', function() {
      if (self.options.cursorOpenInError === true) {
        return _getRequest(null, {
          isInError: true
        });
      }
      if (Object.keys(self.storedData).length === 0) {
        return _getRequest(null);
      }

      var cursor = new FakeCursor(self.storedData);
      var req = _getRequest(cursor);
      cursor.request = req;

      return req;
    });

    sinon.stub(this, 'delete', function(id) {
      if (Array.isArray(self.options.deleteInError) &&
          self.options.deleteInError.indexOf(id) !== -1) {
        return _getRequest(null, {
          isInError: true
        });
      }

      delete self.storedData[id];
      delete self.receivedDataHash[id];
      var idx = self.receivedData.findIndex(function(elem) {
        return elem.id && elem.id === id;
      });
      if (idx !== -1) {
        self.receivedData.splice(idx, 1);
      }

      self.deletedData.push(id);
      return _getRequest(true);
    });

    sinon.stub(this, 'clear', function() {
      self.storedData = {};
      self.receivedDataHash = {};
      self.receivedData = [];

      return _getRequest();
    });
  };

  function FakeIndex(indexName, data, options) {
    this.openCursor = function() {
      if (options.cursorOpenInError === true) {
        return _getRequest(null, {
          isInError: true
        });
      }

      if (Object.keys(data).length === 0) {
        return _getRequest(null);
      }

      var cursor = new FakeCursor(data);
      var req = _getRequest(cursor);
      cursor.request = req;

      return req;
    };
  }

  var FakeCursor = function(data) {
    var _pointer = 0;
    var keys = Object.keys(data);

    Object.defineProperty(this, 'value', {
      get: function() {
        return data[keys[_pointer]];
      }
    });

    this.continue = function() {
      _pointer++;
      if (_pointer < keys.length) {
        this.request.done(this);
      }
      else {
        this.request.done(null);
      }
    };
  };

  var openStub = sinon.stub(window.indexedDB, 'open', function(name) {
    if (Array.isArray(self.options.inErrorDbs) &&
        self.options.inErrorDbs.indexOf(name) !== -1) {
      return _getRequest(null, {
        isInError: true
      });
    }

    var db = new FakeDB(name, self.storedDataDbs[name]);
    dbs.push(db);
    var outReq = _getRequest(db, {
      upgradeNeeded: (Array.isArray(self.options.upgradeNeededDbs) &&
                      self.options.upgradeNeededDbs.indexOf(name) !== -1)
    });

    return outReq;
  });

  var deleteDatabaseStub = sinon.stub(window.indexedDB, 'deleteDatabase',
    function(name) {
      deletedDbs.push(name);
      return _getRequest(null);
    });

  function _getRequest(result, opts) {
    var options = opts || {};

    return {
      result: result,
      error: null,
      set onerror(cb) {
        if (options.isInError) {
          this.error = {
            name: 'DB In Error'
          };
          cb({
              target: this
          });
        }
      },
      set onsuccess(cb) {
        this._doneCb = cb;
        if (!options.isInError) {
          cb({
              target: this
          });
        }
      },
      set onupgradeneeded(cb) {
        if (options.upgradeNeeded) {
          cb({
              target: this
          });
        }
      },
      done: function(result) {
        this.result = result;
        if (typeof this._doneCb === 'function') {
          this._doneCb({
            target: this
          });
        }
      }
    };
  }

  this.mTearDown = () => {
    openStub.restore();
    deleteDatabaseStub.restore();
  };
}
