/* global ComponentUtils */

/**
 * The GaiaPinCard component is a helper to include
 * pinned pages on any view inside gaia
 */
window.GaiaPinCard = (function(win) {
  'use strict';

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaPinCardBaseurl ||
    '/shared/elements/gaia_pin_card/';

  proto.createdCallback = function(test) {
    var shadow = this.createShadowRoot();

    this._template = template.content.cloneNode(true);
    this.container = this._template.querySelector('.pin-card');
    this.bgElement = this._template.querySelector('.background');
    this.descElement = this._template.querySelector('.description');
    this.titleElement = this._template.querySelector('header');
    this.iconElement = this._template.querySelector('i');
    this._background = {};

    shadow.appendChild(this._template);

    ComponentUtils.style.call(this, baseurl);
  };

  Object.defineProperty(proto, 'background', {
    get: function() {
      return this._background;
    },
    set: function(background) {
      var bgSrc = background.src ? 'url(' + background.src +')' : '';
      this._background = background;
      this.bgElement.style.backgroundImage = bgSrc;
      this.bgElement.style.backgroundColor = background.themeColor || 'white';
      var computedStyle = window.getComputedStyle(this.bgElement);
      var colorCodes = getColorCodes(computedStyle.backgroundColor);
      var brightness = getBrightness(colorCodes);
      // Adding opacity to the background color
      var bgColorRgba = 'rgba(' + colorCodes.slice(1).join(',') + ', 0.6)';
      var shadow = 'inset 0 0 0 ' + computedStyle.width;
      this.bgElement.style.boxShadow = shadow + ' ' + bgColorRgba;
      this.container.classList.toggle('light', brightness < 200);
    }
  });

  Object.defineProperty(proto, 'title', {
    get: function() {
      return this.titleElement.textContent;
    },
    set: function(title) {
      this.titleElement.textContent = title;
    }
  });

  Object.defineProperty(proto, 'icon', {
    get: function() {
      return this.iconElement.style.backgroundImage;
    },
    set: function(icon) {
      this.iconElement.style.backgroundImage = icon.url;
      if (icon.small) {
        this.iconElement.classList.add('small');
      }
    }
  });

  Object.defineProperty(proto, 'description', {
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
  });

  var template = document.createElement('template');
  template.innerHTML =
    `<article class="pin-card no-content">
      <i></i>
      <div class="background"></div>
      <header></header>
      <section>
        <p class="description"></p>
      </section>
    </article>`;

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

  // Register and return the constructor
  return document.registerElement('gaia-pin-card', { prototype: proto });
})(window);
