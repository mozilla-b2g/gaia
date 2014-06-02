'use strict';

(function(exports) {

  /**
   * ComponentUtils is a utility which allows us to use web components earlier
   * than we should be able to by polyfilling and fixing platform deficiencies.
   */
  var ComponentUtils = {

    /**
     * Injects a style.css into both the shadow root and outside the shadow
     * root so we can style projected content. Bug 992249.
     */
    style: function(baseUrl) {
      var style = document.createElement('style');
      style.setAttribute('scoped', '');
      var url = baseUrl + 'style.css';
      style.innerHTML = '@import url(' + url + ');';

      this.appendChild(style);

      if (!this.shadowRoot) {
        return;
      }

      // The setTimeout is necessary to avoid missing @import styles
      // when appending two stylesheets. Bug 1003294.
      setTimeout(function nextTick() {
        this.shadowRoot.appendChild(style.cloneNode(true));
      }.bind(this));
    }

  };

  exports.ComponentUtils = ComponentUtils;

}(window));
