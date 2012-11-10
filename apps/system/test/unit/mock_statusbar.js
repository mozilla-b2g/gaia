var MockStatusBar = {
  notificationsCount: null,

  wasMethodCalled: {},

  methodCalled: function msb_methodCalled(name) {
    this.wasMethodCalled[name] =
        this.wasMethodCalled[name] ? this.wasMethodCalled[name]++ : 1;
  },

  updateNotification: function(count) {
    var number = new Number(count);
    this.notificationsCount = number.toString();
    this.mNotificationsUpdated = true;
  },

  updateNotificationUnread: function(unread) {
    this.mNotificationUnread = unread;
  },

  mNotificationsUpdated: false,
  mNotificationUnread: false,
  mTearDown: function tearDown() {
    this.notificationsCount = null;
    this.mNotificationsUpdated = false;
    this.mNotificationUnread = false;
  },
  incSystemDownloads: function msb_incSystemDownloads() {
    this.methodCalled("incSystemDownloads");
  },

  decSystemDownloads: function msb_decSystemDownloads() {
    this.methodCalled("decSystemDownloads");
  }
};
