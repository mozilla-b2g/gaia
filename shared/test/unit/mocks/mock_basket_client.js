console.time("mock_basket_client.js");
/* global Promise */
/* exported MockBasket */

'use strict';

var MockBasket = {
  _err: null,
  _data: {
    'status': 'ok'
  },
  _dataStore: null,

  send: function(data, callback) {
    if (callback) {
      callback(this._err, this._data);
    }
  },

  getDataStore: function() {
    var self = this;
    return new Promise(function (resolve, reject) {
      resolve(self._dataStore);
    });
  }
};
console.timeEnd("mock_basket_client.js");
