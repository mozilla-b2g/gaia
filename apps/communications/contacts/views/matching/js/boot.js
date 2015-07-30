'use strict';
/* global LazyLoader, MatchingUI */

window.addEventListener('DOMContentLoaded', function() {
  LazyLoader.load(['/shared/js/l10n.js']).then(function() {
      // TODO Add if needed
  });
});

window.onload = function() {
  var dependencies = [
    '/shared/js/contact_photo_helper.js',
    '/shared/js/sanitizer.js',
    '/shared/js/contacts/import/utilities/misc.js',
    '/contacts/views/matching/js/matching_ui.js'
  ];

  LazyLoader.load(dependencies).then(function() {
      MatchingUI.init();
  });
};
