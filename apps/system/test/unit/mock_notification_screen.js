var MockNotificationScreen = {
  wasMethodCalled: {},

  mockMethods: [
    'incExternalNotifications',
    'decExternalNotifications',
    'updateStatusBarIcon',
    'addNotification',
    'removeNotification'
  ],

  mockPopulate: function mockPopulate() {
    this.mockMethods.forEach(function(methodName) {
      // we could probably put this method outside if we had a closure
      this[methodName] = function mns_method(param) {
        this.methodCalled(methodName);

        if (methodName == 'addNotification' && this.mCallback) {
          this.mCallback(param);
        }

        if (methodName == 'addNotification' ||
            methodName == 'removeNotification') {
          return {
            addEventListener: function() {},
            removeEventListener: function() {}
          };
        }
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

