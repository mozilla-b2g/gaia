'use strict';

(function(exports) {

  /**
   * FullscreenListener is a simple event listener that listens for
   * fullscreenchange events and applies a class to its element
   * when the element that is fullscreen is a descendent.  This is
   * used in CSS to control what gets displayed in and out of
   * fullscreen mode.
   */
  function FullscreenListener(element) {
    if (!element) {
      throw new Error('No element supplied');
    }

    this.element = element;
    document.addEventListener('mozfullscreenchange', this);
  }

  FullscreenListener.prototype = {
    handleEvent: function (event) {
      let fullscreenElement = document.mozFullScreenElement;
      let isFullscreenAncestor = fullscreenElement &&
          this.element.contains(fullscreenElement);

      this.element.classList.toggle('fullscreen-ancestor',
                                    isFullscreenAncestor);
    },

    stop: function () {
      document.removeEventListener('mozfullscreenchange', this);
    }
  };

  /**
   * FullscreenManager is just a collection of listeners.
   */
  function FullscreenManager() {
    this.listener = new FullscreenListener(document.getElementById('screen'));
    console.log('FullscreenManager', 'fullscreen manager created');
  }

  exports.FullscreenManager = FullscreenManager;

}(window));
