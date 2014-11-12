'use strict';
/* global evt, SettingsList, LazyLoader, SelectionBorder, SpatialNavigator */
(function(exports) {

  function nodeListToArray(obj) {
    return [].map.call(obj, function(element) {
      return element;
    })
  }

  function SettingsGroup(dom, lazyDOMId) {
    var self = this;
    this.container = dom;
    this.bindSelf();
    this.on('itemChoosed', function translateItemToGroup(dom) {
      self.fire('groupChoosed', dom.dataset.group);
    });
    this.init(document.getElementById(lazyDOMId));
  }

  var proto = SettingsGroup.prototype = new SettingsList();

  proto.setActive = function sg_setActive(active) {
    // no matter activate or not, we should reselect the dom node.
    this.selectionBorder.select(this.spatialNavigation.getFocusedElement());
  }

  exports.SettingsGroup = SettingsGroup;
})(window);
