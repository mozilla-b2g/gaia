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
  itemStore: {
    save: function() {}
  },
  grid: {
    add: function(detail) {
      if (detail) {
        MockApp.mItems.push(detail);
      }
    },
    removeUntilDivider: function() {},
    removeIconByIdentifier: function(identifier) {
      delete MockApp.mIcons[identifier];
    },
    removeItemByIndex: function(idx) {
      MockApp.mItems.splice(idx, 1);
    },
    getIcons: function() {
      return MockApp.mIcons;
    },
    getItems: function() {
      return MockApp.mItems;
    },
    render: function() {},

    _grid: {
      dragdrop: {
        inEditMode: false
      }
    }
  }
};

MockApp.mTeardown = function mp_mTeardown() {
  delete MockApp.initialized;
  MockApp.mIcons = {};
  MockApp.mItems = [];
};
