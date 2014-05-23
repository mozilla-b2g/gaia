(function(window) {

  'use strict';

  document.whenLocalized = function(callback) {
    if (document.mozLocalized) {
      setTimeout(callback);
    }
    document.addEventListener('mozDOMLocalized', callback);
  };

  document.firstLocalized = function(callback) {
    if (document.mozLocalized) {
      setTimeout(callback);
      return;
    }
    document.addEventListener('mozDOMLocalized', function callOnce() {
      document.removeEventListener('mozDOMLocalized', callOnce);
      callback();
    });
  };

})(window);
