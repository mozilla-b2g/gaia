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
    style: function(stylesheets, baseUrl) {
      var self = this;

      stylesheets.forEach(add);

      function add(stylesheet) {
        var style = document.createElement('style');
        var url = baseUrl + stylesheet.url;
        style.innerHTML = '@import url(' + url + ');';

        if (stylesheet.scoped) {
          style.setAttribute('scoped', '');
        }

        self.appendChild(style);

        if (!self.shadowRoot) {
          return;
        }

        // The setTimeout is necessary to avoid missing @import styles
        // when appending two stylesheets. Bug 1003294.
        style.onload = function nextTick() {
          self.shadowRoot.appendChild(style.cloneNode(true));
        };
      }
    }
  };

  exports.ComponentUtils = ComponentUtils;

}(window));
