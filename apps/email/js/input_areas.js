/*
 * This file goes along with shared/style/input_areas.css
 * and is required to make the <button type="reset"> buttons work to clear
 * the form fields they are associated with.
 *
 * Bug 830127 should fix input_areas.css and move this JS functionality
 * to a shared JS file, so this file won't be in the email app for long.
 */
define(function(require, exports) {
  return function hookupInputAreaResetButtons(e) {
    // This selector is from shared/style/input_areas.css
    var selector = 'form p input + button[type="reset"],' +
          'form p textarea + button[type="reset"]';
    var resetButtons = e.querySelectorAll(selector);
    for (var i = 0, n = resetButtons.length; i < n; i++) {
      resetButtons[i].addEventListener('mousedown', function(e) {
        e.preventDefault();   // Don't take focus from the input field
      });
      resetButtons[i].addEventListener('click', function(e) {
        e.target.previousElementSibling.value = ''; // Clear input field
        e.preventDefault();   // Don't reset the rest of the form.
      });
    }
  };
});
