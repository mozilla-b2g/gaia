'use strict';

(function (exports) {

  var mediator;

  var toolbar = {};

  toolbar.init = function toolbar_init(options) {
    mediator = options.mediator;
  };

  exports.toolbar = toolbar;

})(window);
