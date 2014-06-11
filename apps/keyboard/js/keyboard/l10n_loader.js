'use strict';

(function(exports) {

var L10nLoader = function() {
  this.loadStarted = false;
};

L10nLoader.prototype.SCRIPT_URL = '/shared/js/l10n.js';

L10nLoader.prototype.load = function() {
  if (this.loadStarted) {
    // Silent early return
    return;
  }
  this.loadStarted = true;

  // Force l10n.js to think we are not pre-translated, and it must transverse
  // the DOM when it loads.
  // XXX: to be removed when bug 1022889 is fixed.
  document.documentElement.lang = 'x-untranslated';

  // Super lazy lazily load l10n.js without checking
  // if it's really loaded or failed.
  var script = document.createElement('script');
  script.src = this.SCRIPT_URL;
  document.body.appendChild(script);
};

exports.L10nLoader = L10nLoader;

})(window);
