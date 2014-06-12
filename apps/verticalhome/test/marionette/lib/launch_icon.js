/* global module */

'use strict';

/**
Launches an icon (which may be a real app launch or download retry)

@param {Marionette.Element} element of particular icon.
*/
module.exports = function launchIcon(element) {
  // XXX: work around focus issues by ensuring we clicked the thing
  element.scriptWith(function(e) {
    e.scrollIntoView(false);
    e.__ensureClick__ = function() {
      e.removeEventListener('click', e.__ensureClick__);
      e.setAttribute('data-test-was-clicked', true);
    };
    e.addEventListener('click', e.__ensureClick__);
  });

  element.client.waitFor(function() {
    // try to click it
    element.click();

    return element.scriptWith(function(e) {
      // if it was clicked clear the state if we want to run this again
      if (e.getAttribute('data-test-was-clicked')) {
        e.removeEventListener('click', e.__ensureClick__);
        e.removeAttribute('data-test-was-clicked');
        return true;
      }

      // otherwise try again
      return false;
    });
  });
};

