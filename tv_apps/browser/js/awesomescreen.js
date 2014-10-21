'use strict';

(function (exports) {

  var mediator;

  var awesomescreen = {};

  awesomescreen.init = function awesomescreen_init(options) {
    mediator = options.mediator;
  };

  exports.awesomescreen = awesomescreen;

})(window);
