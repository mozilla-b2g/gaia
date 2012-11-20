var MockNotificationScreen = {
  wasMethodCalled: {},

  mockMethods: [
    'incExternalNotifications',
    'decExternalNotifications',
    'updateStatusBarIcon'
  ],

  mockPopulate: function mockPopulate() {
    this.mockMethods.forEach(function(methodName) {
      // we could probably put this method outside if we had a closure
      this[methodName] = function mns_method() {
        this.methodCalled(methodName);
      };
    }, this);
  },

  init: function mns_init() {
    this.wasMethodCalled = {};
    this.mockMethods.forEach(function(methodName) {
      this[methodName].wasCalled = false;
    }, this);
  },

  methodCalled: function mns_methodCalled(name) {
    this.wasMethodCalled[name] =
        this.wasMethodCalled[name] ? this.wasMethodCalled[name]++ : 1;
    this[name].wasCalled = true;
  },

  mTeardown: function mns_mTeardown() {
    this.init();
  }
};

MockNotificationScreen.mockPopulate();

