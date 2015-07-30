(function(exports) {
  'use strict';

  var MockUtils = {
    mHoldFocusForAnimationCalled: false,
    holdFocusForAnimation: sinon.stub(),
    mTeardown: function() {
      this.holdFocusForAnimation = sinon.stub();
    }
  };
  exports.MockUtils = MockUtils;
})(window);
