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

  getBeginWith: function(entry, cb) {
    cb.call(this, this.mData);
  },

  mCalledInit: false,
  mCalledAdd: null,
  mCalledClose: false,
  mData: null,
  mTearDown: function tearDown() {
    this.mCalledAdd = null;
    this.mCalledInit = false;
    this.mCalledClose = false;
  }
};
