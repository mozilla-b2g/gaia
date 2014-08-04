'use strict';

(function(exports) {

  function MockAppList(options) {
    MockAppList.singleton._options = options;
    return MockAppList.singleton;
  }

  MockAppList.singleton = evt({
    init: function() {},
    uninit: function() {},
    show: function() {
      this.shown = true;
      return true;
    },
    hide: function() {
      this.shown = false;
      return true;
    },
    isShown: function() {
      return this.shown;
    }
  });

  MockAppList.mTeardown = MockAppList.singleton.reset;
  exports.MockAppList = MockAppList;
})(window);
