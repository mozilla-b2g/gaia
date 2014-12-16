'use strict';
/* global SharedUtils, evt */

window.SmartBanner = (function(win) {

  // Extend from the HTMLElement prototype
  var proto = evt(Object.create(HTMLElement.prototype));

  proto.createdCallback = function() {
    this.style.width = '0';
    this.classList.add('closed');
    this.addEventListener('transitionend', this);
  };

  proto.calculateChildWidth = function() {
    var child = this.firstElementChild;
    var childWidth = 0;
    var style;
    while(child) {
      style = window.getComputedStyle(child);
      childWidth += child.offsetWidth + parseInt(style.marginLeft, 10)
                                      + parseInt(style.marginRight, 10);
      child = child.nextElementSibling;
    }
    return childWidth;
  };

  proto.fireEvent = function(event, detail) {
    var evtObject = new CustomEvent(event, {
                                      bubbles: false,
                                      detail: detail || this
                                    });
    this.dispatchEvent(evtObject);
    this.fire(event, detail);
  };

  proto.handleEvent = function(evt) {
    var self = this;
    switch(evt.type) {
      // Like System app, the transition is our state machine.
      case 'transitionend':
        // We only process 'background-color' because all states have this
        // change.
        if ((evt.propertyName !== 'background-color' &&
             evt.propertyName !== 'width') ||
            evt.target !== this) {
          break;
        }

        if (this.classList.contains('opening')) {
          this.classList.remove('opening');
          // final state: opened
          this.fireEvent('opened');
        } else if (this.classList.contains('closing')) {
          this.classList.remove('closing');
          this.classList.add('closed');
          // final state: closed
          this.fireEvent('closed');
        }
        break;
    }
  };

  proto.focus = proto.open = function() {
    this.fireEvent('will-open');
    // If we get focus when we closing the group, we need to cancel the closing
    // state.
    this.classList.remove('closed');
    this.classList.remove('closing');
    this.classList.add('opening');
    // change to opening
    this.style.width = this.calculateChildWidth() + 'px';
  };

  proto.blur = proto.close = function() {
    this.fireEvent('will-close');
    // We may call close at mid state, we need to reset all of them and go to
    // closing state
    this.classList.remove('opening');
    this.classList.add('closing');
    this.style.width = '0';
  };

  // Register and return the constructor
  return document.registerElement('smart-banner', { prototype: proto });
})(window);
