
'use strict';

(function(exports) {

  var width = window.innerWidth;
  var height = window.innerHeight;

  function setDimensionsInternal() {
    width = window.innerWidth;
    height = window.innerHeight;
  }

  function setDimensions() {
    var isPortrait = '(orientation: portrait)';
    if (window.matchMedia(isPortrait).matches) {
      setDimensionsInternal();
    } else {
      window.matchMedia(isPortrait).addListener(function onOrientation(evt) {
        if (evt.matches) {
          window.matchMedia(isPortrait).removeListener(onOrientation);
          setTimeout(setDimensionsInternal);
        }
      });
    }
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
