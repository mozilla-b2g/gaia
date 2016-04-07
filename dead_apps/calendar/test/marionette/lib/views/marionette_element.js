'use strict';

var Marionette = require('marionette-client');

/**
 * This base class is used to inherit all methods from Marionette.Element, this
 * will allow us to call methods like `text()`, `click()`, etc in the View
 * context.
 */
function MarionetteElement(client, el) {
  this.client = client;
  this.element = el;
}
module.exports = MarionetteElement;

// Mix-in methods from Marionette.Element.prototype
Object.keys(Marionette.Element.prototype).forEach(function(funcName) {
  var elementFn = Marionette.Element.prototype[funcName];
  MarionetteElement.prototype[funcName] = function() {
    return elementFn.apply(this.element, arguments);
  };
});
