var MockStatusBar = {
  notificationsCount: null,

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
  }
};
