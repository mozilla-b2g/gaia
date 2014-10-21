'use strict';

(function (exports) {

  var mediator;

  var settings = {};

  settings.init = function (options) {
    mediator = options.mediator;
  };

  exports.settings = settings;

})(window);
