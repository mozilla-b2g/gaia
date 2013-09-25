var MockModalDialog = {

  mMethods: [
    'alert'
  ],

  mPopulate: function mmd_mPopulate() {
    this.mMethods.forEach(function(methodName) {
      this[methodName] = function mmd_method() {
        this.mMethodCalled(methodName, Array.slice(arguments));
      };
    }, this);
  },

  init: function mmd_init() {
    this.mMethods.forEach(function(methodName) {
      this[methodName].mWasCalled = false;
      this[methodName].mArgs = null;
    }, this);
  },

  showWithPseudoEvent: function mmd_showWIthPseudoEvent(param) {
    if (this.mCallback) {
      this.mCallback(param);
    }
  },

  mMethodCalled: function mmd_mMethodCalled(name, args) {
    this[name].mWasCalled = true;
    this[name].mArgs = args;
  },

  mTeardown: function mmd_mTeardown() {
    this.init();
  }
};

MockModalDialog.mPopulate();


