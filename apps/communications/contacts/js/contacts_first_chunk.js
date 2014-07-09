/**
 * This file renders the first chunk of contacts right on startup time.
 * Every time list.js renders the items above the fold, it will cache them
 * in localStorage. On a next run we can grab the items from LS and render
 * immediately. This means we don't have to wait on mozContacts calls for the
 * items above the fold, giving a better user experience.
 */
'use strict';

(function() {
  var chunk = localStorage.getItem('first-chunk');
  if (chunk) {
    document.getElementById('groups-list').innerHTML = chunk;
  }
})();
