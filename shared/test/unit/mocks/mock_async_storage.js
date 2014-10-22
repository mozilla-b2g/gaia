console.time("mock_async_storage.js");
/*exported MockasyncStorage */

'use strict';

var MockasyncStorage = {
  getItem: function(key, callback) {},
  setItem: function(key, value) {},
  removeItem: function() {}
};
console.timeEnd("mock_async_storage.js");
