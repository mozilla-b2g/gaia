require('helper.js');
require('/common/vendor/marionette-client/marionette.js');

(function() {

  if (typeof(testSupport) === 'undefined') {
    testSupport = {};
  }

  var env = window.xpcModule.require('env');

  const GAIA_PROTOCOL = env.get('GAIA_PROTOCOL') || 'app://';
  const GAIA_DOMAIN = env.get('GAIA_DOMAIN') || 'gaiamobile.org';
  const GAIA_PORT = env.get('GAIA_PORT') || '';


  testSupport.gaiaUrl = function testSupport_gaiaUrl(domain, url) {
    if (typeof(url) === 'undefined') {
      url = '';
    }
    return GAIA_PROTOCOL + domain + '.' + GAIA_DOMAIN + GAIA_PORT + '/' + url;
  };

}());
