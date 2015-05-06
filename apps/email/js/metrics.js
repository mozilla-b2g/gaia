'use strict';

/**
 * Handles sending out metrics, since final states are distributed across cards
 * and their interior actions. Need something to coordinate the completion of
 * certain states to know when to emit the right events. Used right now for:
 * https://developer.mozilla.org/en-US/Apps/Build/Performance/Firefox_OS_app_responsiveness_guidelines
 *
 * Events tracked:
 *
 * apiDone: triggered when app knows data is flowing back and forth from the
 * worker.
 *
 * contentDone: when a card's content is completely available. This includes
 * any parts that were needed
 */
define(function(require) {
  var evt = require('evt'),
      apiDone = false,
      contentDone = false;

  function checkAppLoaded() {
    if (apiDone && contentDone) {
      window.performance.mark('fullyLoaded');
    }
  }

  // Event listeners. Note they all unsubscribe after the first reception of
  // that kind of event. This is because cards, who can have multiple instances,
  // can emit the events throughout the lifetime of the app, and for the
  // purposes of the startup events, they only need to be done once on startup.
  evt.once('metrics:apiDone', function onApiDone() {
    apiDone = true;
    checkAppLoaded();
  });

  evt.once('metrics:contentDone', function() {
    contentDone = true;

    // Only need to dispatch these events if the startup cache was not used.
    if (!window.startupCacheEventsSent) {
      // Now that content is in, it is visually loaded, and content is
      // interactive, since event listeners are bound as part of content
      // insertion.
      window.performance.mark('visuallyLoaded');
      window.performance.mark('contentInteractive');
    }

    checkAppLoaded();
  });
});
