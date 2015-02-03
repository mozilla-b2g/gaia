(function(exports) {
  'use strict';

  var MockCardStore = {
    _dataInStore: {},
    mPrepareData: function(id, data) {
      this._dataInStore[id] = data;
    },

    mClearData: function() {
      this._dataInStore = {};
    },

    getData: function(id) {
      var that = this;
      return new Promise(function(resolve, reject) {
        if (that._dataInStore[id]) {
          resolve(that._dataInStore[id]);
        } else {
          resolve(undefined);
        }
      });
    },

    saveData: function(id, data) {
      var that = this;
      return new Promise(function(resolve, reject) {
        that._dataInStore[id] = data;
        resolve();
      });
    }
  };

  exports.MockCardStore = MockCardStore;
}(window));
