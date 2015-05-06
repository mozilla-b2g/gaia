'use strict';
/* exported MockStatusBar */

var MockStatusBar = {
  name: 'Statusbar',

  getIcon: function(id) {
    if (document.getElementById(id)) {
      return document.getElementById(id);
    } else {
      var ele = document.createElement('div');
      ele.id = id;
      document.body.appendChild(ele);
      this.mIconsElements.push(ele);
      return ele;
    }
  },

  height: 20,

  notificationsCount: null,

  wasMethodCalled: {},

  methodCalled: function msb_methodCalled(name) {
    this.wasMethodCalled[name] =
        this.wasMethodCalled[name] ? this.wasMethodCalled[name]++ : 1;
  },

  updateNotification: function(count) {
    /* jshint -W053 */
    var number = new Number(count);
    this.notificationsCount = number.toString();
    this.methodCalled('updateNotification');
  },

  setActive: function(unread) {
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

  expand: function() {
    this.methodCalled('expand');
  },

  collapse: function() {
    this.methodCalled('collapse');
  }
};
