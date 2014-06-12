'use strict';

function MockApp() {
  MockApp.initialized = false;
  MockApp.mIcons = {};
  MockApp.mItems = [];
}

MockApp.prototype = {
  HIDDEN_ROLES: ['system', 'keyboard', 'homescreen', 'search'],
  init: function() {
    MockApp.initialized = true;
  },
  mGetInitialized: function () {
    return MockApp.initialized;
  },
  grid: {
    addIcon: function(identifier, obj) {
      MockApp.mIcons[identifier] = obj;
      MockApp.mItems.push(obj);
    },
    render: function() {}
  }
};

MockApp.mTeardown = function mp_mTeardown() {
  delete MockApp.initialized;
  MockApp.mIcons = {};
  MockApp.mItems = [];
};
