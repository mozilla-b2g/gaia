/* global mediator, awesomescreen, toolbar, settings, config */

'use strict';

(function () {

  window.addEventListener('load', function browserOnLoad(evt) {
    window.removeEventListener('load', browserOnLoad);

    // Init relevant modules and inject the mediator into these modules
    mediator.init({
      config: config,
      awesomescreen: awesomescreen,
      toolbar: toolbar,
      settings: settings
    });
  });

})();
