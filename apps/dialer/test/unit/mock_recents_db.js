var MockRecentsDBManager = {
  add: function(entry, cb) {
    this.mCalledAdd = entry;
    cb.call(this);
  },

  init: function(cb) {
    this.mCalledInit = true;
    cb.call(this);
  },

  close: function() {
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
