console.time("mock_enumerate_all.js");
'use strict';

var MockEnumerateAll = function(storages, dir, options) {
  return {
    result: {
      name: MockEnumerateAll.certificateName
    },
    set onsuccess(callback) {
      callback();
    },
    continue: function() {}
  };
};

MockEnumerateAll.certificateName = 'filename';
console.timeEnd("mock_enumerate_all.js");
