/* global define */
(function(define){'use strict';define(function(require,exports,module){

/**
 * Exports
 */

var base = window.GAIA_ICONS_BASE_URL ||
           window.COMPONENTS_BASE_URL ||
           'bower_components/';

if (!document.documentElement) {
  window.addEventListener('load', load);
} else {
  load();
}

function load() {
  if (isLoaded()) { return; }

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = base + 'gaia-icons/gaia-icons.css';
  document.head.appendChild(link);
  exports.loaded = true;
}

function isLoaded() {
  return exports.loaded ||
    document.querySelector('link[href*=gaia-icons]') ||
    document.documentElement.classList.contains('gaia-icons-loaded');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));
