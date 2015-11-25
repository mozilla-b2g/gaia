'use strict';

(function(exports) {
  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function() {
    this._template = template.content.cloneNode(true);

    var shadow = this.createShadowRoot();
    shadow.appendChild(this._template);

    this.container = shadow.querySelector('gaia-container');
  };

  proto.transferIconFromContainer = function(icon) {

  };

  proto.transferIconToContainer = function(icon) {

  };

  proto.expand = function() {
    console.log('Group expanded');
  };

  proto.collapse = function() {
    console.log('Group collapsed');
  };

  var template = document.createElement('template');
  template.innerHTML =
    `<style>@import url('style/group.css');</style>
     <gaia-container></gaia-container>`;

  exports.Group = document.registerElement('homescreen-group',
                                           { prototype: proto });
}(window));
