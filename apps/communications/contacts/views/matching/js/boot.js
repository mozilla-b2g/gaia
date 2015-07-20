'use strict';
/* global LazyLoader, MatchingUI, MatchingController */

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
    '/contacts/views/matching/js/matching_ui.js',
    '/contacts/views/matching/js/matching_controller.js'
  ];

  LazyLoader.load(dependencies).then(function() {
      MatchingUI.init();
      MatchingController.init();
  });
};
