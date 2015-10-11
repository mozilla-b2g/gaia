/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global SynctoServerFixture */
/* exported Kinto */

var Kinto = (function() {
  var mockProblem =  null;

  var KintoCollectionMock = function(collectionName, options = {}) {
    this.collectionName = collectionName;
    this.data = null;
    this.fireConflicts = options.fireConflicts || [];
    this._idSchemaUsed = options.idSchema; // Not mocking default UUID IdSchema.
    this._remoteTransformersUsed = options.remoteTransformers;
  };
  KintoCollectionMock.prototype = {
    sync: function() {
      var dataRecordIn = JSON.parse(JSON.stringify(
        SynctoServerFixture.remoteData[this.collectionName]));
      var transformOut = (item) => {
        if (!this._remoteTransformersUsed) {
          return Promise.resolve(item);
        }
        // We're only mocking the case where there is just one
        // remoteTransformer.
        return this._remoteTransformersUsed[0].encode(item);
      };

      var transformIn = () => {
        if (!this._remoteTransformersUsed) {
          return Promise.resolve();
        }
        try {
          // We're only mocking the case where there is just one
          // remoteTransformer.
          return this._remoteTransformersUsed[0].decode(dataRecordIn).
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

      this.pushData = [];

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

    list: function() {
      return Promise.resolve(this.listData);
    },

    get: function() {
      return Promise.resolve({
        data: this.listData.data[0]
      });
    },

    create: function(obj, options = {}) {
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
      for (var i = 0; i < this.listData.data.length; i++) {
        if (this.listData.data[i].id === obj.id) {
          this.listData.data[i] = obj;
          return Promise.resolve();
        }
      }
      return Promise.reject('not found!');
    },

    delete: function(id) {
      for (var i = 0; i < this.listData.data.length; i++) {
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
      return Promise.reject(new Error(`HTTP 0; TypeError: NetworkError when att\
empting to fetch resource.`));
    },
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
      err.response = {
        status: this.status
      };
      return Promise.reject(err);
    },
    list() {},
    get() {},
    create() {},
    update() {},
    delete() {},
  };


  var Kinto = function(kintoOptions) {
    this.options = kintoOptions;
    this.collection = function(collectionName, collectionOptions = {}) {
      var mockProblemCase = () => {
        var httpCode;
        if (mockProblem &&
            mockProblem.collectionName === collectionName) {
          httpCode = parseInt(mockProblem.problem);
          if (isNaN(httpCode)) {
            if (mockProblem.problem === 'conflicts') {
              collectionOptions.fireConflicts = [{
                local: { bar: 'local' },
                remote: SynctoServerFixture.historyEntryDec.payload
              }];
              return new KintoCollectionMock(collectionName, collectionOptions);
            }
            return new KintoCollectionMock(mockProblem.problem,
                                           collectionOptions);
          }
          return new HttpCodeKintoCollectionMock(httpCode);
        }
      };

      var unauthCase = () => {
        if (kintoOptions.headers.Authorization !==
            'BrowserID test-assertion-mock') {
          return new HttpCodeKintoCollectionMock(401);
        }
      };

      var unreachableCase = () => {
        if (kintoOptions.remote !== 'http://localhost:8000/v1/') {
          return new UnreachableKintoCollectionMock(collectionName);
        }
      };

      var defaultCase = () => {
        return new KintoCollectionMock(collectionName, collectionOptions);
      };

      return mockProblemCase() ||
        unauthCase() ||
        unreachableCase() ||
        defaultCase();
    };
  };

  Kinto.setMockProblem = (problem) => {
    mockProblem = problem;
  };

  return Kinto;
})();
