'use strict';

(function(exports) {

var L10nLoader = function() {
  this.loadStarted = false;
};

L10nLoader.prototype.SCRIPT_URL = '/shared/js/intl/l20n.js';

L10nLoader.prototype.load = function() {
  if (this.loadStarted) {
    // Silent early return
    return;
  }
  this.loadStarted = true;

  // Super lazy lazily load l20n.js without checking
  // if it's really loaded or failed.
  var script = document.createElement('script');
  script.src = this.SCRIPT_URL;
  document.body.appendChild(script);
};

exports.L10nLoader = L10nLoader;

})(window);
