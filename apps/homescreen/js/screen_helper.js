
'use strict';

(function(exports) {

  var width = window.innerWidth;
  var height = window.innerHeight;

  if (!width) {
    width = screen.width;
  }
  if (!height) {
    // 20px statusbar (2rem * 10px see system/style/statusbar/statusbar.css)
    height = screen.height - 20;
  }

  function setDimensions() {
    width = window.innerWidth;
    height = window.innerHeight;
  }

  if (document.hidden) {
    document.addEventListener('visibilitychange', function onVisible() {
      document.removeEventListener('visibilitychange', onVisible);
      setDimensions();
    });
  } else {
    setDimensions();
  }

  exports.ScreenHelper = {
    get width() {
      return width;
    },

    get height() {
      return height;
    }
  };

}(window));
