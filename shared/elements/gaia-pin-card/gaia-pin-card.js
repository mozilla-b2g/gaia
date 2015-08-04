/* globals define, require, exports, module */
(function(define){'use strict';define(function(require,exports,module){

  /**
   * Dependencies
   */

  var component = require('gaia-component');


  module.exports = component.register('gaia-pin-card', {
    extends: HTMLElement.prototype,

    created: function() {
      this.setupShadowRoot();
      this.container = this.shadowRoot.querySelector('.pin-card');
      this.bgElement = this.shadowRoot.querySelector('.background');
      this.iconElement = this.shadowRoot.querySelector('gaia-site-icon');
      this.descElement = this.shadowRoot.querySelector('.description');
      this.titleElement = this.shadowRoot.querySelector('header');
      this.iconElement = this.shadowRoot.querySelector('gaia-site-icon');
      this._background = {};
    },

    attrs: {
      background: {
        get: function() {
          return this._background;
        },
        set: function(background) {
          var bgSrc = background.src ? 'url(' + background.src +')' : '';
          this._background = background;
          this.bgElement.style.backgroundImage = bgSrc;
          var color = background.themeColor || 'white';
          this.bgElement.style.backgroundColor = color;
          var computedStyle = window.getComputedStyle(this.bgElement);
          var colorCodes = getColorCodes(computedStyle.backgroundColor);
          var brightness = getBrightness(colorCodes);
          // Adding opacity to the background color
          var bgColorRgba = 'rgba(' + colorCodes.slice(1).join(',') + ', 0.6)';
          var shadow = 'inset 0 0 0 ' + computedStyle.width;
          this.bgElement.style.boxShadow = shadow + ' ' + bgColorRgba;
          this.container.classList.toggle('light', brightness < 200);
        },
      },
      title: {
        get: function() {
          return this.titleElement.textContent;
        },
        set: function(title) {
          this.titleElement.textContent = title;
        }
      },
      icon: {
        get: function() {
          return this.iconElement.background;
        },
        set: function(iconUrl) {
          this.iconElement.background = iconUrl;
        }
      },
      description: {
        get: function() {
          return this.descElement.textContent;
        },
        set: function(desc) {
          if (desc) {
            this.descElement.textContent = desc;
            this.container.classList.remove('no-content');
            return;
          }

          this.container.classList.add('no-content');
        }
      }
    },
    template: `<article class="pin-card no-content">
        <gaia-site-icon></gaia-site-icon>
        <div class="background"></div>
        <header></header>
        <section>
          <p class="description"></p>
        </section>
      </article>

      <style>
        .pin-card {
          position: relative;
          float: left;
          min-width: 14rem;
          height: 10.5rem;
          border-radius: .5rem;
          background-color: #FBFBFB;
          background-size: cover;
          color: #000;
          font-weight: 500;
          font-family: sans-serif;
        }

        .pin-card > * {
          pointer-events: none;
        }

        .pin-card.light,
        .pin-card.light p.description {
          color: #fff;
        }

        .pin-card .background {
          position: absolute;
          width: 100%;
          height: 100%;
          opacity: 0.7;
          border-radius: .5rem;
          top: 0;
          left: 0;
          z-index: 0;
          background-size: cover;
        }

        .pin-card gaia-site-icon {
          position: absolute;
          top: -1.5rem;
          left: calc(50% - 1.5rem);
          z-index: 1;
        }

        .pin-card header {
          position: relative;
          text-align: center;
          margin-top: 2.5rem;
          overflow: hidden;
          line-height: 1.6rem;
        }

        .pin-card.no-content header {
          height: 7.6rem;
        }

        .pin-card p.description {
          margin: 1rem 0;
          position: relative;
          font-size: 1.4rem;
          line-height: 1.2rem;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          color: #5D5D5D;
        }
      </style>`
  });

  function getColorCodes(color) {
    var colorCodes = /rgb\((\d+), (\d+), (\d+)\)/.exec(color);
    return colorCodes;
  }

  function getBrightness(colorCodes) {
    if (!colorCodes || colorCodes.length === 0) {
      return;
    }
    var r = parseInt(colorCodes[1]);
    var g = parseInt(colorCodes[2]);
    var b = parseInt(colorCodes[3]);
    return Math.sqrt((r*r) * 0.241 + (g*g) * 0.691 + (b*b) * 0.068);
  }

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-pin-card',this));
