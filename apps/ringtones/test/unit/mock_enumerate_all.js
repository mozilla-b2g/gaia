'use strict';

var MockEnumerateAll = function(storages, dir, options) {
  var callback = null;
  var index = 0;

  function nextFile(self) {
    if (!(dir in MockEnumerateAll.files)) {
      self.result = null;
    } else if (index == MockEnumerateAll.files[dir].length) {
      self.result = null;
    } else {
      self.result = { name: dir + '/' + MockEnumerateAll.files[dir][index++] };
    }
    callback.call(self);
  }

  return {
    result: null,
    set onsuccess(cb) {
      callback = cb;
      nextFile(this);
    },
    continue: function() {
      nextFile(this);
    }
  };
};

MockEnumerateAll.files = {};
