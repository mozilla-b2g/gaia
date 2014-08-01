'use strict';

// Store timestamp when JS started running
window.jsStarted = Date.now();

define(function(require) {

// Store performance timestamps
var perf = {
  jsStarted: window.jsStarted,
  firstModule: Date.now()
};

/**
 * Module Dependencies
 */

var App = require('app');

// Create new `App`
var app = window.app = new App({
  el: document.body,
  doc: document,
  win: window,
  perf: perf,
  deps: [
    'l10n',
    'l10n-date',
    'template',
    'enumerate-all',
    'mediadb',
    'font-size-utils',
    'media-utils',
    'downsample',
    'scroll-detector',
    'dialogs',
    // Gallery specific code
    'gallery'
  ],
  lazyDeps: []
});

setTimeout(function() {
  app.boot();
}, 0);

});
