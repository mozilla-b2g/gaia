'use strict';

function MockDeviceStorage() {
  MockDeviceStorage.instances.push(this);

  this.entries = [
    {name: 'mock1'},
    {name: 'mock2'},
    {name: 'mock3'},
    {name: 'mock4'}
  ];

  this.cursors = [];
}

MockDeviceStorage.mSetup = function() {
  this.realGetDeviceStorage = navigator.getDeviceStorage;
  navigator.getDeviceStorage = function() {
    return new MockDeviceStorage();
  };

  MockDeviceStorage.instances = [];
};

MockDeviceStorage.mTeardown = function() {
  navigator.getDeviceStorage = this.realGetDeviceStorage;
  MockDeviceStorage.instances = [];
};

MockDeviceStorage.prototype.enumerate = function() {
  var storage = this;

  var req = {
    onsuccess: null,
    onerror: null
  };

  var cursor = {
    index: -1,

    done: false,

    continue: function() {
      this.index += 1;

      if (this.index < storage.entries.length) {
        this.result = storage.entries[this.index];
      } else {
        this.result = null;
        this.done = true;
      }

      setTimeout(function() {
        if (req.onsuccess) {
          req.onsuccess.call(cursor);
        }
      });
    },

    result: null
  };

  this.cursors.push(cursor);
  cursor.continue();
  return req;
};

MockDeviceStorage.prototype.delete = function(name) {
  for (var i = 0; i < this.entries.length; i++) {
    if (this.entries[i] && this.entries[i].name === name) {
      this.entries.splice(i, 1);
      break;
    }
  }

  if (i > this.entries.length) {
    return;
  }

  for (var j = 0; j < this.cursors.length; j++) {
    if (this.cursors[j].index >= i) {
      this.cursors[j].index -= 1;
    }
  }
};
