'use strict';

(function() {

  var singleVariantConf = {
    'https://aHost/aMan1': {
      'screen': 1,
      'manifest' : 'https://aHost/aMan1',
      'location' : 15},
    'https://aHost/aMan2' : {
      'screen' : 2,
      'manifest' : 'https://aHost/aMan2',
      'location' : 6},
    'https://aHost/aMan3' : {
      'screen' : 2,
      'manifest' : 'https://aHost/aMan3',
      'location': 0}
  };

  var MockConfigurator = {
    getSection: function() { return null; },
    getSingleVariantApps: function() {
      return singleVariantConf;
    }
  };

  window.MockConfigurator = MockConfigurator;
})();
