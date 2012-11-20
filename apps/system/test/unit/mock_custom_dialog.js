var MockCustomDialog = {
  show: function(title, msg, cancel, confirm) {
    this.mShown = true;
    this.mShowedTitle = title;
    this.mShowedMsg = msg;
    this.mShowedCancel = cancel;
    this.mShowedConfirm = confirm;
  },

  hide: function() {
    this.mShown = false;
  },

  mShown: false,
  mShowedTitle: null,
  mShowedMsg: null,
  mShowedCancel: null,
  mShowedConfirm: null,
  mTeardown: function teardown() {
    this.mShown = false;
    this.mShowedTitle = null;
    this.mShowedMsg = null;
    this.mShowedCancel = null;
    this.mShowedConfirm = null;
  }
};
