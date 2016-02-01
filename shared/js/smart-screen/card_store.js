/* global evt, PipedPromise, SharedUtils */

(function(exports) {
  'use strict';

  var CardStore = function(name, mode, manifestURL) {
    var that = this;
    this._mode = mode || 'readwrite';
    this._name = name;
    if (manifestURL) {
      this._manifestURL = manifestURL;
      this._getStore();
    } else {
      this._isOwner = true;
      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var app = evt.target.result;
        that._manifestURL = app.manifestURL;
        that._getStore();
      };
    }
  };

  CardStore.prototype = evt({
    _dataStore: undefined,

    _appRevisionId: undefined,

    _manifestURL: undefined,

    // Only two modes available: readonly and readwrite (default)
    // 'readwrite' mode is for Smart-Home app only
    _mode: 'readwrite',

    isStarted: function cs_isStarted() {
      return !!this._manifestURL && !!this._dataStore;
    },

    canWrite: function cs_canWrite() {
      return this._mode === 'readwrite';
    },

    _onChange: function(evt) {
      this.fire('change', evt);
    },

    _getStore: function cs_getStore() {
      var that = this;
      return this._getPipedPromise('_getStore', function(resolve, reject) {
        if (that.isStarted()) {
          resolve(that._dataStore);
          return;
        }
        navigator.getDataStores(that._name).then(
        function(stores) {
          stores.forEach(function(store) {
            if (store.owner === that._manifestURL) {
              that._dataStore = store;
              that._dataStore.addEventListener('change',
                that._onChange.bind(that));
            }
          });
          if (that._dataStore) {
            resolve(that._dataStore);
          } else {
            reject();
          }
        });
      });
    },

    getData: function cs_getData(id) {
      var that = this;
      return new Promise(function(resolve, reject) {
        that._getStore().then(function onFulfill(store) {
          if (store) {
            store.get(id).then(resolve);
          } else {
            reject('no store available');
          }
        }, function onReject(reason) {
          reject(reason);
        });
      });
    },

    saveData: function cs_saveData(id, data) {
      var that = this;
      return new Promise(function(resolve, reject) {
        if (that.canWrite()) {
          that._getStore().then(function onFulfill(store) {
            if (store) {
              store.put(data, id).then(resolve, function(error) {
                reject(error);
              });
            } else {
              reject('no store available');
            }
          }, function onReject(reason) {
            reject(reason);
          });
        } else {
          // resolve directly without actually writing anything,
          // because we are in readonly mode
          resolve();
        }
      });
    },

    iterateData: function cs_listData(cb) {
      return new Promise((resolve, reject) => {

        this._getStore().then(store => {
          return store.sync();

        // For a brand-new cursor, when calling next() continuously, the task
        // sequence looks like:
        // 1st call: operation 'clear'
        // 2st call: operation 'add' with 1st entry
        // 3rd call: operation 'add' with 2nd
        // ...
        // n+1st call: operation 'add' with nth data entry
        // n+2nd call: operation 'done'
        }).then(function iterateTask(cursor) {
          cursor.next().then(task => {
            if (task.operation == 'add') {
              cb(task.data, task.id);
              iterateTask(cursor);
            } else if (task.operation == 'clear') {
              iterateTask(cursor);
            } else if (task.operation == 'done') {
              cursor.close();
              resolve();
            } else {
              iterateTask(cursor);
            }
          });
        });
      });
    },

    addData: function cs_addData(data, id) {
      return this._getStore().then(store => {
        return store.add(data, id);
      });
    },

    removeData: function cs_removeData(id) {
      return this._getStore().then(store => {
        return store.remove(id);
      });
    },

    getLength: function cs_getLength() {
      return this._getStore().then(store => {
        return store.getLength();
      });
    },

    get isOwner() {
      return this._isOwner;
    }
  });

  SharedUtils.addMixin(CardStore, PipedPromise);

  exports.CardStore = CardStore;
}(window));
