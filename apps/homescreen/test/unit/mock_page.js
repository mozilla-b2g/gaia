'use strict';

requireApp('homescreen/test/unit/mock_icon.js');

function MockPage(container, icons) {
  this.container = container;
}

MockPage.prototype = {
  getNumIcons: function mp_getNumIcons() {
    return MockPage.mIcons.length;
  },

  getIconDescriptors: function() {
  },

  moveByWithEffect: function mp_moveByWithEffect() {
    MockPage.mMoveByWithEffectCalled = true;
  },

  appendIcon: function mp_appendIcon() {
  },

  getFirstIcon: function mp_getFirstIcon() {
    return MockPage.mIcons[0] || null;
  },

  moveBy: function mp_moveBy(value) {
    MockPage.mMoveByArg = value;
  },

  tap: function mp_tap() {
  }
};

MockPage.mSetup = function mp_mSetup() {
  MockPage.mIcons = [new MockIcon()];
};

MockPage.mTeardown = function mp_mTeardown() {
  delete MockPage.mMoveByWithEffectCalled;
  delete MockPage.mMoveByArg;
};

var MockDock = MockPage;

