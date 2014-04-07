'use strict';
requirejs(['require_config'], function() {
  requirejs(['ring_view'], function(RingView) {

    // Initialize a singleton object
    RingView.singleton();

    var onready = window.postMessage.bind(window.opener, {
      type: 'ringer',
      status: 'READY'
    }, window.location.origin);

    window.addEventListener('load', onready, false);
    if (document.readyState === 'complete') {
      onready();
      window.removeEventListener('load', onready, false);
    }
  });
});
