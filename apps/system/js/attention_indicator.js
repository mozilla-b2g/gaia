'use strict';
(function(exports) {
  /**
   * AttentionIndicator will draw an css-animated line on top of the screen
   * to let the user know there is an attention window
   * which transition state is closed.
   */
  var AttentionIndicator = function() {
    this.render = this.render.bind(this);
  };
  AttentionIndicator.prototype = {
    start: function() {
      this.containerElement = document.getElementById('screen');
      if (this.element) {
        return;
      } else {
        this.render();
      }
    },
    stop: function() {
      window.addEventListener('screenrendered', this.render);
    },
    render: function() {
      if (this._rendered) {
        return;
      }
      this._rendered = true;
      this.containerElement.insertAdjacentHTML('beforeend', this.view());
      this.element =
        this.containerElement.querySelector('#attention-indicator');
    },
    view: function() {
      return '<div id="attention-indicator" class="attention-indicator" ' +
              'data-z-index-level="attention-indicator">' +
              '<div class="handle handle1"></div>' +
              '<div class="handle handle2"></div>' +
              '<div class="handle handle3"></div>' +
            '</div>';
    },
    show: function() {
      this.element.classList.add('visible');
    },
    hide: function() {
      this.element.classList.remove('visible');
    }
  };
  exports.AttentionIndicator = AttentionIndicator;
}(window));
