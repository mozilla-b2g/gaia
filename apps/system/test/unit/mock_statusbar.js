var MockStatusBar = {
  height: 20,

  notificationsCount: null,

  wasMethodCalled: {},

  methodCalled: function msb_methodCalled(name) {
    this.wasMethodCalled[name] =
        this.wasMethodCalled[name] ? this.wasMethodCalled[name]++ : 1;
  },

  updateNotification: function(count) {
    var number = new Number(count);
    this.notificationsCount = number.toString();
    this.methodCalled('updateNotification');
  },

  updateNotificationUnread: function(unread) {
    this.mNotificationUnread = unread;
  },

  mNotificationUnread: false,
  mTeardown: function teardown() {
    this.notificationsCount = null;
    this.mNotificationsUpdated = false;
    this.mNotificationUnread = false;
    this.wasMethodCalled = {};
    this.height = 20;
  },

  incSystemDownloads: function msb_incSystemDownloads() {
    this.methodCalled('incSystemDownloads');
  },

  decSystemDownloads: function msb_decSystemDownloads() {
    this.methodCalled('decSystemDownloads');
  },

  expand: function() {
    this.methodCalled('expand');
  },

  collapse: function() {
    this.methodCalled('collapse');
  }
};
