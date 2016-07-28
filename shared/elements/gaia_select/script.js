'use strict';
/* global ComponentUtils */

window.GaiaSelect = (function(win) {
  // Extend from the HTMLSelectElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Allow baseurl to be overridden (used for demo page)
  var baseurl = window.GaiaSelectBaseurl || '../shared/elements/gaia_select/';

  var selectCounter = 0;

  proto.createdCallback = function() {
    var label = this.querySelector('label');
    if (label) {
      // If we have a label, make sure it correctly associated
      var select = this.querySelector('select');
      if (label.control != select) {
        // If it not associated, do so.
        var id = select.id;
        if (!id) {
          // If the select does not already have an id, create one.
          select.id = id = 'gaia-select-' + (++selectCounter);
        }
        label.htmlFor = id;
      }
    }

    ComponentUtils.style.call(this, baseurl);
  };

  // Register and return the constructor
  return document.registerElement('gaia-select', { prototype: proto });
})(window);
