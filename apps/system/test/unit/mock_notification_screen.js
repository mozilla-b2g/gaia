var MockNotificationScreen = {
  wasMethodCalled: {},

  mockMethods: [
    'incExternalNotifications',
    'decExternalNotifications',
    'updateStatusBarIcon'
  ],

  mockPopulate: function mockPopulate() {
    this.mockMethods.forEach((function(methodName) {
      // we could probably put this method outside if we had a closure
      this[methodName] = function mns_method() {
        this.methodCalled(methodName);
      };
    }).bind(this));
  },

  init: function mns_init() {
    this.wasMethodCalled = {};
  },

  methodCalled: function mns_methodCalled(name) {
    this.wasMethodCalled[name] =
        this.wasMethodCalled[name] ? this.wasMethodCalled[name]++ : 1;
  },

  mTearDown: function mns_mTearDown() {
    this.wasMethodCalled = {};
  }
};

MockNotificationScreen.mockPopulate();

