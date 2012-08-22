var MockRecentsDBManager = {
  _add: function(entry, cb) {
    this.mCalledAdd = entry;
    cb.call(this);
  },

  _init: function(cb) {
    this.mCalledInit = true;
    cb.call(this);
  },

  _close: function() {
    this.mCalledClose = true;
  },

  mCalledInit: false,
  mCalledAdd: null,
  mCalledClose: false,
  mTearDown: function tearDown() {
    this.mCalledAdd = null;
    this.mCalledInit = false;
    this.mCalledClose = false;
  }
};
