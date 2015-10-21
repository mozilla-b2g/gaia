'use strict';
define(function(require) {
  return function cardsInit(cards) {
    // Handle cases where a default card is needed for back navigation
    // after a non-default entry point (like an activity) is triggered.
    cards.pushDefaultCard = function(onPushed) {
      // Dynamically require model_create, so that cards init does not depend
      // explicitly on the model, just use it if a default card is needed.
      require(['model_create'], function(modelCreate) {
        cards.pushCard('message_list', 'none', {
          model: modelCreate.defaultModel,
          onPushed: onPushed
        },
        // Default to "before" placement.
        'left');
      });
    };
  };
});
