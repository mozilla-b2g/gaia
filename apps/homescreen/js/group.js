'use strict';

(function(exports) {
  // Maximum number of icons that can be contained in a group.
  const MAX_CHILDREN = 6;

  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function() {
    this.container = document.createElement('gaia-container');
    this.container.id = 'group-container';
    this._template = template.content.cloneNode(true);
    this._template.appendChild(this.container);

    var shadow = this.createShadowRoot();
    shadow.appendChild(this._template);
  };

  proto.transferFromContainer = function(child, container) {
    container.removeChild(child, () => {
      this.container.appendChild(child);
      var icon = child.firstElementChild;
      icon.showName = false;
    });
  };

  proto.transferToContainer = function(child, container) {
    var icon = child.firstElementChild;
    this.container.removeChild(child, () => {
      container.insertBefore(child, this.nextSibling);
      icon.showName = true;
    });
  };

  proto.expand = function() {
    console.log('Group expanded');
  };

  proto.collapse = function() {
    console.log('Group collapsed');
  };

  Object.defineProperty(proto, 'full', {
    get: function() {
      return this.container.children.length >= MAX_CHILDREN;
    },
    enumerable: true
  });

  var template = document.createElement('template');
  template.innerHTML =
    `<style>@import url('style/group.css');</style>`;

  exports.Group = document.registerElement('homescreen-group',
                                           { prototype: proto });
}(window));
