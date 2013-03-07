'use strict';

function MockPage(container, icons) {
  this.container = container;
}

MockPage.prototype = {
  getNumIcons: function mp_getNumIcons() {
    // at least 1 or it will be removed
    return 1;
  },
  getIconDescriptors: function() {
  },
  moveByWithEffect: function mp_moveByWithEffect() {
    MockPage.mMoveByWithEffectCalled = true;
  }
};

MockPage.mTeardown = function mp_mTeardown() {
  delete MockPage.mMoveByWithEffectCalled;
};

var MockDock = MockPage;
