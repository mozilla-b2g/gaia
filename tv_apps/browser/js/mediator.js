'use strict';

(function (exports) {

  var awesomescreen;
  var toolbar;
  var settings;

  var mediator = {};

  mediator.init = function mediator_init(options) {
    awesomescreen = options.awesomescreen;
    toolbar = options.toolbar;
    settings = options.settings;

    toolbar.init({mediator: mediator});
    awesomescreen.init({mediator: mediator});
    settings.init({mediator: mediator});
  };

  // Navigation methods

  // UI methods

  // Data methods

  exports.mediator = mediator;

})(window);
