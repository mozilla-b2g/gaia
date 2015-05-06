'use strict';
define(function(require) {
  return function cardsInit(cards) {
    // Handle cases where a default card is needed for back navigation
    // after a non-default entry point (like an activity) is triggered.
    cards.pushDefaultCard = function(onPushed) {
      cards.pushCard('message_list', 'none', {
        onPushed: onPushed
      },
      // Default to "before" placement.
      'left');
    };
  };
});
