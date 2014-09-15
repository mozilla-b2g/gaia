'use strict';

/* exported MockICEData */

var MockICEData = {
  _mChangeCallbacks: [],
  iceContacts: [],
  load: function() {},
  setICEContact: function(id, pos, active) {
    this.iceContacts[pos] = {
      id: id,
      active: active
    };
  },
  listenForChanges: function(cb) {
    this._mChangeCallbacks.push(cb);
  },
  stopListenForChanges: function() {
    this._mChangeCallbacks = [];
  },
  _mTriggerChange: function(data) {
    this._mChangeCallbacks.forEach(function(fn) {
      fn(data);
    });
  }
};