'use strict';

requireApp('homescreen/test/unit/mock_icon.js');

function MockPage(container, icons, numberOfIcons) {
  this.container = container;
  this.maxIcons = numberOfIcons || 16;
  if (icons) {
    this.icons = icons;
  } else {
    this.icons = [];
  }
}

MockPage.prototype = {
  mMAX_ICON_NUMBER: 16,

  getNumIcons: function mp_getNumIcons() {
    return MockPage.mIcons.length;
  },

  getIconDescriptors: function() {
    return Array.prototype.map.call(this.icons, function(icon) {
      return icon.descriptor;
    });
  },

  moveByWithEffect: function mp_moveByWithEffect() {
    MockPage.mMoveByWithEffectCalled = true;
  },

  appendIcon: function mp_appendIcon(icon) {
    this.icons.push(icon);
  },

  getFirstIcon: function mp_getFirstIcon() {
    return MockPage.mIcons[0] || null;
  },

  moveBy: function mp_moveBy(value) {
    MockPage.mMoveByArg = value;
  },

  tap: function mp_tap() {
  },

  hasEmptySlot: function mp_hasEmptySlot() {
    return this.icons.length < this.mMAX_ICON_NUMBER;
  },

  popIcon: function mp_popIcon() {
    return {
      loadRenderedIcon: function() {}
    };
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
