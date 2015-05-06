/* global $, LazyLoader, picking */
/* exported Overlay */

'use strict';

/*
 * This module handles the display of Gallery app overlays: these are full
 * screen dialogs that are displayed when the app cannot be used transiently
 * or permanenty (when there is no sdcard, e.g.)
 *
 * Different overlays are identified by with a string. Pass the id of an
 * overlay to Overlay.show() to show that overlay. Call Overlay.hide() to
 * hide the current overlay. Overlay.current holds the id of the current
 * overlay, or null if no overlay is displayed.
 *
 * Supported ids include:
 *
 *   nocard: no sdcard is installed in the phone
 *   pluggedin: the sdcard is being used by USB mass storage
 *   emptygallery: no pictures found
 *   scanning: scanning the sdcard for photo's, but none found yet
 *
 * Localization is done using the specified id with "-title" and "-text"
 * suffixes.
 *
 * Some overlays have a cancel button (for cancelling a pick activity) and
 * some have a camera button (for switching to the Camera) app. When those
 * buttons are clicked, we dispatch synthetic "cancel" and "camera" events.
 * Use the addEventListener() and removeEventListener() functions to manage
 * listeners for these events.
 */
var Overlay = {
  current: null,

  hide: function hide() {
    Overlay.current = null;
    $('overlay').classList.add('hidden');
    document.body.classList.remove('showing-dialog');
  },

  show: function show(id) {
    Overlay.current = id;
    LazyLoader.load('shared/style/confirm.css', function() {
      // hide any special elements
      $('overlay-camera-button').classList.add('hidden');
      $('overlay-cancel-button').classList.add('hidden');
      $('overlay-menu').classList.add('hidden');
      document.body.classList.add('showing-dialog');
      var title, text;
      switch (id) {
        case null:
          Overlay.hide();
          return;
        case 'nocard':
          title = 'nocard3-title';
          text = 'nocard4-text';
          if (picking) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'pluggedin':
          title = 'pluggedin2-title';
          text = 'pluggedin2-text';
          if (picking) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'scanning':
          title = 'scanning-title';
          text = 'scanning-text';
          if (picking) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        case 'emptygallery':
          title = picking ? 'emptygallery2-title-pick' :
                                'emptygallery2-title';
          text = 'emptygallery2-text';
          $('overlay-menu').classList.remove('hidden');
          if (picking) {
            $('overlay-cancel-button').classList.remove('hidden');
          } else {
            $('overlay-camera-button').classList.remove('hidden');
          }
          break;
        case 'upgrade':
          title = 'upgrade-title';
          text = 'upgrade-text';
          if (picking) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          break;
        default:
          console.warn('Reference to undefined overlay', id);
          if (picking) {
            $('overlay-cancel-button').classList.remove('hidden');
            $('overlay-menu').classList.remove('hidden');
          }
          return;
      }

      $('overlay-title').setAttribute('data-l10n-id', title);
      $('overlay-text').setAttribute('data-l10n-id', text);
      $('overlay').classList.remove('hidden');
    });
  },

  addEventListener: function(type, listener) {
    $('overlay').addEventListener(type, listener);
  },

  removeEventListener: function(type, listener) {
    $('overlay').removeEventListener(type, listener);
  },
};

// Register handlers on the button elements that dispatch higher-level
// events on the overlay itself.
$('overlay-cancel-button').addEventListener('click', function() {
  $('overlay').dispatchEvent(new CustomEvent('cancel'));
});

$('overlay-camera-button').addEventListener('click', function() {
  $('overlay').dispatchEvent(new CustomEvent('camera'));
});
