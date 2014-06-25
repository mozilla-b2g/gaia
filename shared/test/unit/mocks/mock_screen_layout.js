'use strict';

var MockScreenLayout = {
  getCurrentLayout: function() {
    return true;
  },

  watch: function(name, media) {
  }
};

window.ScreenLayout = MockScreenLayout;
