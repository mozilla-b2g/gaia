/*
 * This file goes along with shared/style/input_areas.css
 * and is required to make the <button type="reset"> buttons work to clear
 * the form fields they are associated with.
 *
 * Bug 830127 should fix input_areas.css and move this JS functionality
 * to a shared JS file, so this file won't be in the email app for long.
 */
'use strict';
define(function(require, exports) {
  var slice = Array.prototype.slice;

  return function hookupInputAreaResetButtons(e) {
    // This selector is from shared/style/input_areas.css
    var selector = 'form p input + button[type="reset"],' +
          'form p textarea + button[type="reset"]';
    var resetButtons = slice.call(e.querySelectorAll(selector));
    resetButtons.forEach(function(resetButton) {
      resetButton.addEventListener('mousedown', function(e) {
        e.preventDefault();   // Don't take focus from the input field
      });
      resetButton.addEventListener('click', function(e) {
        e.target.previousElementSibling.value = ''; // Clear input field
        e.preventDefault();   // Don't reset the rest of the form.
      });
    });
  };
});
