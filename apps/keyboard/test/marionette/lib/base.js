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
  }
};
