(function(define){define(function(require,exports,module){

  /**
   * ComponentUtils is a utility which allows us to use web components earlier
   * than we should be able to by polyfilling and fixing platform deficiencies.
   */
  module.exports = {

    /**
     * Injects a style.css into both the shadow root and outside the shadow
     * root so we can style projected content. Bug 992249.
     */
    style: function(stylesheets) {
      var self = this;

      stylesheets.forEach(add);

      function add(stylesheet) {
        var style = document.createElement('style');
        style.innerHTML = '@import url(' + stylesheet.url + ');';

        if (stylesheet.scoped) {
          style.setAttribute('scoped', '');
        }

        self.appendChild(style);

        if (!self.shadowRoot) {
          return;
        }

        // The setTimeout is necessary to avoid missing @import styles
        // when appending two stylesheets. Bug 1003294.
        style.addEventListener('load', function() {
          self.shadowRoot.appendChild(style.cloneNode(true));
        });
      }
    }
  };

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-component-utils',this));