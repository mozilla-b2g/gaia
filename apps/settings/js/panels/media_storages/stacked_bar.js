/**
 * The module for generating an stacked bar UI element for a volume.
 *
 * @module media_storages/stacked_bar
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');

  var StackedBar =
    Module.create(function StackedBar(div) {
      this._container = div;
      this._items = [];
      this._totalSize = 0;
  });

  StackedBar.prototype.add = function(item) {
    this._totalSize += item.value;
    this._items.push(item);
  };

  StackedBar.prototype.refreshUI = function() {
    this._container.parentNode.setAttribute('aria-disabled', false);
    this._container.parentNode.hidden = false;
    this._items.forEach((item) => {
      var className = 'color-' + item.type;
      var ele = this._container.querySelector('.' + className);
      if (!ele) {
        ele = document.createElement('span');
        ele.classList.add(className);
        ele.classList.add('stackedbar-item');
        this._container.appendChild(ele);
      }
      ele.style.width = (item.value * 100) / this._totalSize + '%';
    });
  };

  StackedBar.prototype.reset = function() {
    this._items = [];
    this._totalSize = 0;
    this._container.parentNode.setAttribute('aria-disabled', true);
    this._container.parentNode.hidden = true;
  };

  return StackedBar;
});
