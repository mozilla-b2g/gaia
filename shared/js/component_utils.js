
(function(exports) {
  'use strict';

  /**
   * ComponentUtils is a utility which allows us to use web components earlier
   * than we should be able to by polyfilling and fixing platform deficiencies.
   */
  exports.ComponentUtils = {

    /**
     * Injects a style.css into both the shadow root and outside the shadow
     * root so we can style projected content. Bug 992249.
     */
    style: function(baseUrl) {
      var style = document.createElement('style');
      var url = baseUrl + 'style.css';
      var self = this;

      style.setAttribute('scoped', '');
      style.innerHTML = '@import url(' + url + ');';
      this.appendChild(style);

      this.style.visibility = 'hidden';

      // Wait for the stylesheet to load before injecting
      // it into the shadow-dom. This is to work around
      // bug 1003294, let's review once landed.
      style.addEventListener('load', function() {

        // Put a clone of the stylesheet into the shadow-dom.
        // We have to use two <style> nodes, to work around
        // the lack of `:host` (bug 992245) and `:content`
        // (bug 992249) selectors. Once we have those we
        // can do all our styling from a single style-sheet
        // within the shadow-dom.
        if (self.shadowRoot) {
          self.shadowRoot.appendChild(style.cloneNode(true));
        }

        self.style.visibility = '';
      });
    }
  };
}(window));
