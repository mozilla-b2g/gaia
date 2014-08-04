/* global define */
define(function() {
  'use strict';

  var ctor = function mockListView() {
    if (ctor.mInnerFunction) {
      return ctor.mInnerFunction.apply(this, arguments);
    } else {
      return {
        set: function(newArray) {},
        destroy: function() {}
      };
    }
  };

  ctor.mTeardown = function mockListViewTeardown() {
    ctor.mInnerFunction = null;
  };

  return ctor;
});
