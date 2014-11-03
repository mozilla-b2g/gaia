'use strict';

(function (exports) {

  var config;
  var awesomescreen;
  var toolbar;
  var settings;

  var mediator = {};

  mediator.init = function mediator_init(options) {
    config = options.config;
    awesomescreen = options.awesomescreen;
    toolbar = options.toolbar;
    settings = options.settings;

    toolbar.init({mediator: mediator});
    awesomescreen.init({mediator: mediator});
    settings.init({mediator: mediator});
  };

  mediator.uninit = function mediator_uninit() {
    config = null;
    awesomescreen = null;
    toolbar = null;
    settings = null;
  };

  // Navigation methods

  // UI methods

  // Data methods

  exports.mediator = mediator;

})(window);
