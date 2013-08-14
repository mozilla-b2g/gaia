'use strict';

var MocksHelper = function(mocks) {
  this.mocks = mocks;
  this.realWindowObjects = {};

  // bind functions to myself
  for (var key in this) {
    if (typeof this[key] === 'function') {
      this[key] = this[key].bind(this);
    }
  }
};

MocksHelper.prototype = {

  init: function mh_init() {
    this.mocks.forEach(function(objName) {
      if (!window[objName]) {
        window[objName] = null;
      }
    });
    return this;
  },

  attachTestHelpers: function mh_attachTestHelpers() {
    // these functions are already bound to this in the constructor
    suiteSetup(this.suiteSetup);
    suiteTeardown(this.suiteTeardown);
    setup(this.setup);
    teardown(this.teardown);
  },

  setup: function mh_setup() {
    this._forEachMock('mSetup');
  },

  suiteSetup: function mh_suiteSetup() {
    this.mocks.forEach(function(objName) {
      var mockName = 'Mock' + objName;
      if (!window[mockName]) {
        var errMsg = 'Mock ' + mockName + ' has not been loaded into the test';
        throw new Error(errMsg);
      }

      this.realWindowObjects[objName] = window[objName];
      window[objName] = window[mockName];
    }, this);
    this._forEachMock('mSuiteSetup');
  },

  suiteTeardown: function mh_suiteTeardown() {
    this._forEachMock('mSuiteTeardown');
    this.mocks.forEach(function(objName) {
      window[objName] = this.realWindowObjects[objName];
    }, this);
  },

  teardown: function mh_teardown() {
    this._forEachMock('mTeardown');
  },

  _forEachMock: function mh_forEachMock(funcName) {
    this.mocks.forEach(function(objName) {
      var mockName = 'Mock' + objName;
      var mock = window[mockName];

      if (mock[funcName]) {
        mock[funcName]();
      }
    });
  }
};

