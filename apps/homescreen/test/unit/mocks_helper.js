var MocksHelper = function(mocks) {
  this.mocks = mocks;
  this.realWindowObjects = {};
};

MocksHelper.prototype = {

  setup: function mh_setup() {
  },

  suiteSetup: function mh_suiteSetup() {
    this.mocks.forEach(function(objName) {
      var mockName = 'Mock' + objName;
      if (!window[mockName]) {
        throw 'Mock ' + mockName + ' has not been loaded into the test';
      }

      this.realWindowObjects[objName] = window[objName];
      window[objName] = window[mockName];
    }, this);
  },

  suiteTeardown: function mh_suiteTeardown() {
    this.mocks.forEach(function(objName) {
      window[objName] = this.realWindowObjects[objName];
    }, this);
  },

  teardown: function mh_teardown() {
    this.mocks.forEach(function(objName) {
      var mockName = 'Mock' + objName;
      var mock = window[mockName];

      if (mock.mTeardown) {
        mock.mTeardown();
      }
    });
  }
};

