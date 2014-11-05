'use strict';
/* global ComponentUtils */

window.GaiaOverflowMenu = (function(win) {
  // Extend from HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaOverflowMenuBaseurl ||
    '/shared/elements/gaia_overflow_menu/';

  proto.createdCallback = function() {
    var shadow = this.createShadowRoot();

    this._template = template.content.cloneNode(true);

    shadow.appendChild(this._template);
    ComponentUtils.style.call(this, baseurl);

    this.addEventListener('click', this);
    this.addEventListener('animationend', this);
    this.addEventListener('transitionend', this);

    this.classList.add('hidden');
  };

  proto.show = function() {
    // XXX You can't show a hiding overflow menu. We may want to reconsider
    //     this behaviour at some point, or make it optional.
    if (this.classList.contains('hidden')) {
      this.classList.remove('hidden');
      this.classList.add('showing');
    }
  };

  proto.hide = function() {
    // XXX You can't hide a showing overflow menu. We may want to reconsider
    //     this behaviour at some point, or make it optional.
    if (!this.classList.contains('hidden') &&
        !this.classList.contains('showing')) {
      this.classList.add('hiding');
    }
  };

  proto.handleEvent = function(evt) {
    switch(evt.type) {
      case 'click':
        evt.preventDefault();
        this.hide();
        break;

      case 'transitionend':
        if (evt.target === this) {
          if (this.classList.contains('hiding')) {
            this.classList.remove('hiding');
            this.classList.add('hidden');
          }
        }
        break;

      case 'animationend':
        this.classList.remove('showing');
        break;
    }
  };

  var template = document.createElement('template');

  template.innerHTML =
    `<div>
      <content select="button"></content>
    </div>`;

  // Register and return the constructor
  return document.registerElement('gaia-overflow-menu', { prototype: proto });
})(window);
