/* globals define, require, exports, module */
(function(define){'use strict';define(function(require,exports,module){

  /**
   * Dependencies
   */

  var component = require('gaia-component');

  var base = window.COMPONENTS_BASE_URL ||
             'bower_components/';


  module.exports = component.register('gaia-site-icon', {
    extends: HTMLElement.prototype,

    created: function() {
      this.setupShadowRoot();
      this._background = this.shadowRoot.querySelector('i');
      var url = 'url(' + base + 'gaia-site-icon/images/default_icon.png)';
      this._background.style.backgroundImage = url;
    },

    attrs: {
      background: {
        get: function() {
          return this._background.style.backgroundImage;
        },
        set: function(background) {
          this._background.style.backgroundImage = background.url;
          this._background.classList.toggle('small', !!background.isSmall);
        }
      },
      isSmall: {
        get: function() {
          return this._background.classList.contains('small');
        }
      }
    },
    template: `<i></i>

      <style>
          :host {
            position: absolute;
            width: 3.2rem;
            height: 3.2rem;
            overflow: hidden;
          }

        i {
          background: no-repeat center;
          background-size: cover;
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
        }

        i.small {
          background: #cfcfcf no-repeat center / 1.6rem;
          border-radius: 100%;
        }
      </style>`
  });

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-site-icon',this));
