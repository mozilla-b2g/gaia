/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global SynctoServerFixture */
/* exported Kinto */

var Kinto = (function() {
  var mockProblem =  null;

  var KintoCollectionMock = function(collectionName, fireConflicts=[]) {
    this.collectionName = collectionName;
    this._remoteTransformerUsed = null;
    this.data = null;
    this.fireConflicts = fireConflicts;
  };
  KintoCollectionMock.prototype = {
    sync: function() {
      var dataRecordIn = JSON.parse(JSON.stringify(
        SynctoServerFixture.remoteData[this.collectionName]));
        var transformOut = (item) => {
          if (!this._remoteTransformerUsed) {
            return Promise.resolve(item);
          }
          return this._remoteTransformerUsed.encode(item);
        };

        var transformIn = () => {
          if (!this._remoteTransformerUsed) {
            return Promise.resolve();
          }
          try {
            return this._remoteTransformerUsed.decode(dataRecordIn).
                then(decoded => {
              dataRecordIn = decoded;
            });
          } catch(err) {
            return Promise.reject(err);
          }
        };

        var pushOut = () => {
        if (!this.listData) {
          return Promise.resolve();
        }
        this.pushData = [];
        return Promise.all(this.listData.data.map(item => {
          var dataRecordOut = JSON.parse(JSON.stringify(item));
          transformOut(dataRecordOut).then(encoded => {
            this.pushData.push(encoded);
          });
        }));
      };

      var checkIdSchema = () => {
        if (!this._idSchemaUsed.validate(dataRecordIn.id)) {
          return Promise.reject(new Error('Invalid id: ' +
              dataRecordIn.id));
        }
      };

      var storeListData = () => {
        if (!this.listData) {
          this.listData = { data: [ dataRecordIn ] };
        }
        return Promise.resolve({ ok: true, conflicts: this.fireConflicts });
      };

      var reportError = (error) => {
        this.listData = { data: [] };
        return Promise.resolve({ ok: false, conflicts: [], errors: [ error ] });
      };

      return pushOut().
          then(transformIn).
          then(checkIdSchema).
          then(storeListData).
          catch(reportError);
    },

    resolve: function(conflict, resolution) {
      this.listData = { data: [ resolution ] };
      return Promise.resolve();
    },

    use: function(plugin) {
      if (plugin.type === 'idschema') {
        this._idSchemaUsed = plugin;
      } else {
        this._remoteTransformerUsed = plugin;
      }
    },

    list: function() {
      return Promise.resolve(this.listData);
    },

    get: function() {
      return Promise.resolve({
        data: this.listData.data[0]
      });
    },

    create: function(payload, options={}) {
      var obj = {
        payload: payload
      };
      if (options.forceId) {
        if(!this._idSchemaUsed.validate(options.forceId)) {
          return Promise.reject(new Error('Invalid id: ' + options.forceId));
        }
        obj.id = options.forceId;
      } else {
        obj.id = this._idSchemaUsed.generate();
      }
      this.listData.data.push(obj);
      return Promise.resolve();
    },

    update: function(obj) {
      for (var i=0; i<this.listData.data.length; i++) {
        if (this.listData.data[i].id === obj.id) {
          this.listData.data[i] = obj;
          return Promise.resolve();
        }
      }
      return Promise.reject('not found!');
    },

    delete: function(id) {
      for (var i=0; i<this.listData.data.length; i++) {
        if (this.listData.data[i].id === id) {
          this.listData.data.splice(i, 1);
          return Promise.resolve();
        }
      }
      return Promise.reject('not found!');
    }
  };

  var UnreachableKintoCollectionMock = function() {};
  UnreachableKintoCollectionMock.prototype = {
    sync() {
      return Promise.reject(new Error());
    },
    use() {},
    list() {},
    get() {},
    create() {},
    update() {},
    delete() {},
  };

  var HttpCodeKintoCollectionMock = function(status) {
    this.status = status;
  };
  HttpCodeKintoCollectionMock.prototype = {
    sync() {
      var err = new Error();
      err.request = {
        status: this.status
      };
      return Promise.reject(err);
    },
    use() {},
    list() {},
    get() {},
    create() {},
    update() {},
    delete() {},
  };

  var Kinto = function(options) {
    this.options = options;

    this.collection = function(collectionName) {
      var mockProblemCase = () => {
        var httpCode;
        if (mockProblem &&
            mockProblem.collectionName === collectionName) {
          httpCode = parseInt(mockProblem.problem);
          if (isNaN(httpCode)) {
            if (mockProblem.problem === 'conflicts') {
              return new KintoCollectionMock(collectionName, [{
                local: { bar: 'local' },
                remote: SynctoServerFixture.historyEntryDec.payload
              }]);
            }
            return new KintoCollectionMock(mockProblem.problem);
          }
          return new HttpCodeKintoCollectionMock(httpCode);
        }
      };

      var unauthCase = () => {
        if (options.headers.Authorization !== 'BrowserID test-assertion-mock') {
          return new HttpCodeKintoCollectionMock(401);
        }
      };

      var unreachableCase = () => {
        if (options.remote !== 'http://localhost:8000/v1/') {
          return new UnreachableKintoCollectionMock(collectionName);
        }
      };

      var defaultCase = () => {
        return new KintoCollectionMock(collectionName);
      };

      return mockProblemCase() ||
        unauthCase() ||
        unreachableCase() ||
        defaultCase();
    };
  };

  Kinto.createRemoteTransformer = (obj) => {
    var transformerClass = obj.constructor;
    transformerClass.prototype = {
      type: 'remotetransformer',
      encode: obj.encode,
      decode: obj.decode
    };
    return transformerClass;
  };

  Kinto.createIdSchema = (obj) => {
    var schemaClass = obj.constructor;
    schemaClass.prototype = {
      type: 'idschema',
      generate: obj.generate,
      validate: obj.validate
    };
    return schemaClass;
  };

  Kinto.setMockProblem = (problem) => {
    mockProblem = problem;
  };

  return Kinto;
})();
