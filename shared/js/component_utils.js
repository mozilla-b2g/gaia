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

      style.setAttribute('scoped', '');
      style.innerHTML = '@import url(' + url + ');';
      this.appendChild(style);

      // Because the stylsheet is loaded using @import
      // there is a high chance that we may see 'FOUC'.
      // To avoid this, we hide the component until we
      // know that the stylesheet has loaded.
      this.style.visibility = 'hidden';

      // Wait for the stylesheet to load before injecting
      // it into the shadow-dom. This is to work around
      // bug 1003294, let's review once landed.
      style.onload = function() {

        // Put a clone of the stylesheet into the shadow-dom.
        // We have to use two <style> nodes, to work around
        // the lack of `:host` (bug 992245) and `:content`
        // (bug 992249) selectors. Once we have those we
        // can do all our styling from a single style-sheet
        // within the shadow-dom.
        if (this.shadowRoot) {
          this.shadowRoot.appendChild(style.cloneNode(true));
        }

        // Show the component now we know it's styled
        this.style.visibility = '';
      }.bind(this);
    }
  };
}(window));
