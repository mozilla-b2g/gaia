'use strict';

var realScreenLayout = ScreenLayout;

var MockScreenLayout = {
  getCurrentLayout: function() {
    return true;
  },

  mSuiteTeardown: function() {
    ScreenLayout = realScreenLayout;
  }
};

ScreenLayout = MockScreenLayout;
