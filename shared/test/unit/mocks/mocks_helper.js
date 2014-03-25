/* global
    suiteSetup,
    suiteTeardown,
    setup,
    teardown
*/

'use strict';

var MocksHelper = function(mocks) {
  this.mocks = mocks.sort();
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
    // we run this function here instead of in the constructor to make mocha
    // fail when this throws
    this._assertMocksAreUnique();

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
  },

  _assertMocksAreUnique: function mh_assertMocksAreUnique() {
    var notUnique = {};

    for (var i = 1, l = this.mocks.length; i < l; i++) {
      var prev = this.mocks[i - 1],
          curr = this.mocks[i];

      // `this.mocks` is sorted in the constructor, so duplicate items end up
      // adjacent.
      if (curr === prev) {
        notUnique[curr] = 1; // Have a unique list
      }
    }

    notUnique = Object.keys(notUnique);
    if (notUnique.length) {
      var errMsg = 'One or more mocks have been specified more than once: ' +
        notUnique.join(', ');

      throw new Error(errMsg);
    }
  }
};

