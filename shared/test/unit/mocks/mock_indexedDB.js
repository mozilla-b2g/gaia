'use strict';

function MockIndexedDB() {
  var request = {};
  var transRequest = {};

  var dbs = [];
  var deletedDbs = [];
  this.options = {};

  var self = this;

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

  var FakeDB = function(name) {
    var dummyFunction = function() {};
    this.receivedData = [];
    this.deletedData = [];
    this.storedData = {};
    this.options = {};

    this.objectStoreNames = ['fakeObjStore'];
    this.createObjectStore = dummyFunction;
    this.deleteObjectStore = dummyFunction;
    this.transaction = sinon.stub();
    this.objectStore = sinon.stub();
    this.get = dummyFunction;
    this.put = dummyFunction;
    this.delete = dummyFunction;
    this.openCursor = dummyFunction;
    this.close = dummyFunction;

    this.transaction.returns(this);
    this.objectStore.returns(this);

    var self = this;

    sinon.stub(this, 'close', function() {
      self.isClosed = true;
    });

    sinon.stub(this, 'put', function(data) {
      self.receivedData.put(data);
      return transRequest;
    });

    sinon.stub(this, 'get', function(key) {
      return _getRequest(self.storedData[key]);
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
      self.deletedData.push(id);
      return _getRequest(true);
    });
  };

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

  sinon.stub(window.indexedDB, 'open', function(name) {
    if (Array.isArray(self.options.inErrorDbs) &&
        self.options.inErrorDbs.indexOf(name) !== -1) {
      return _getRequest(null, {
        isInError: true
      });
    }

    var db = new FakeDB(name);
    dbs.push(db);
    var outReq = _getRequest(db, {
      upgradeNeeded: (Array.isArray(self.options.upgradeNeededDbs) &&
                      self.options.upgradeNeededDbs.indexOf(name) !== -1)
    });

    return outReq;
  });

  sinon.stub(window.indexedDB, 'deleteDatabase', function(name) {
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
}
