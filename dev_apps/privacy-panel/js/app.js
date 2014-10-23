(function() {
  'use strict';

  function init() {

    // register events for main page
    window.pp.root.init();

    // load all templates for location accuracy sections
    window.pp.panel.load('ala', function() {
      window.pp.ala.init();
    });

    // load all templates for remote privacy sections
    window.pp.panel.load('rpp', function() {
      window.pp.rpp.init();
    });

    // load all templates for guided tour sections
    window.pp.panel.load('gt');

    document.querySelector('body').dataset.ready = true;
  }

  window.onload = init;
})();
