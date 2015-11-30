'use strict';


function Base(client, origin, selectors) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.origin = origin;
  this.selectors = selectors;
}

module.exports = Base;

Base.prototype = {
  launch: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body');
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  switchTo: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(this.origin);
  },

  findElement: function(name) {
    return this.client.findElement(this.selectors[name]);
  },

  waitForElement: function(name) {
    var element = this.client.helper.waitForElement(this.selectors[name]);
    this.client.waitFor(function() {
      return element.scriptWith(function(el) {
        var style = window.getComputedStyle(el);
        return style.visibility === 'visible';
      });
    }.bind(this));
    return element;
  }
};
