/**
 * Weinre app client script
 * When debugging gaia through weinre, the weinre_system.js script
 * will put the weinre host in the hash of every app created by the
 * window manager.
 * This script reads that information and uses it to load weinre with
 * the right configuration options.
 */
(function() {
  var injectWeinre = function() {
    // grab the host from the hash
    var host = (window.location.hash.match(/\bweinre=([^&|$]+)/) || [])[1];
    if (!host)
      return;
    // now inject the weinre script
    (function(e, host) {
      var src = 'http://' + host + '/target/target-script-min.js#anonymous';
      e.setAttribute('src', src);
      document.getElementsByTagName('body')[0].appendChild(e);
    })(document.createElement('script'), host);
  };

  // already loaded, then inject, otherwise wait...
  if (document.readyState === 'complete')
    injectWeinre();
  else
    document.addEventListener('DOMContentLoaded', injectWeinre);
})();
