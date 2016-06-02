'use strict';
requirejs(['require_config'], function() {
  requirejs(['ring_view'], function(RingView) {
    window.ringView = new RingView();
  });
});
