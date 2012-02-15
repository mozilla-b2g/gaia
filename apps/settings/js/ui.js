/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  Gaia.UI = {
    viewStack: null,
    init: function() {
      this.viewStack = $('#view-stack').data('viewStack');
      
      window.addEventListener('keypress', this, true);
    },
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'keypress':
          var viewStack = this.viewStack;
          
          if (viewStack.views.length === 1)
            return;

          if (viewStack.isTransitioning) {
            evt.preventDefault();
            evt.stopPropagation();
            return;
          }

          if (evt.keyCode === evt.DOM_VK_ESCAPE) {
            evt.preventDefault();
            evt.stopPropagation();
            viewStack.pop();
          }
          break;
        default:
          break;
      }
    }
  };
  
  Gaia.UI.AnimationLoop = function(renderCallback) {
    var isRunning = true;
    var lastFrame = Date.now();
    var requestAnimationFrame = function(animFrameCallback) {
      if (window.mozRequestAnimationFrame)
        window.mozRequestAnimationFrame(animFrameCallback);
      else if (window.webkitRequestAnimationFrame)
        window.webkitRequestAnimationFrame(animFrameCallback);
      else if (window.requestAnimationFrame)
        window.requestAnimationFrame(animFrameCallback);
    };

    (function loop(currentFrame) {
      if (isRunning !== false) {
        requestAnimationFrame(loop);
        isRunning = renderCallback(currentFrame - lastFrame);
        lastFrame = currentFrame;
      }
    })(lastFrame);
  };

  window.addEventListener('load', function() {
    Gaia.UI.init();
  });

})();
