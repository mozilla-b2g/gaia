var MockNotificationHelper = {
  send: function(title, body, icon, clickCB, closeCB) {
    this.mTitle = title;
    this.mBody = body;
    this.mIcon = icon;
    this.mClickCB = clickCB;
    this.mCloseCB = closeCB;
  },

  mTitle: null,
  mBody: null,
  mIcon: null,
  mClickCB: null,
  mCloseCB: null,
  mTeardown: function teardown() {
    this.mTitle = null;
    this.mBody = null;
    this.mIcon = null;
    this.mClickCB = null;
    this.mCloseCB = null;
  }
};
