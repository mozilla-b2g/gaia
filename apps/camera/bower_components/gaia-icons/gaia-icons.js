(function(define){define(function(require,exports,module){
/*jshint laxbreak:true*/

/**
 * Exports
 */

var base = window.GAIA_ICONS_BASE_URL
  || window.COMPONENTS_BASE_URL
  || 'bower_components/';

// Load it if it's not already loaded
if (!isLoaded()) { load(base + 'gaia-icons/gaia-icons.css'); }

function load(href) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  document.head.appendChild(link);
  exports.loaded = true;
}

function isLoaded() {
  return exports.loaded ||
    document.querySelector('link[href*=gaia-icons]') ||
    document.documentElement.classList.contains('gaia-icons-loaded');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));
