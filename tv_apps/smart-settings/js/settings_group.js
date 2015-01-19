'use strict';
/* global SettingsList */
(function(exports) {

  function SettingsGroup() {
    var self = this;
    this.bindSelf();
    this.on('itemChoosed', function translateItemToGroup(data) {
      self.fire('groupChoosed', data.dom.dataset.group);
    });
  }

  var proto = SettingsGroup.prototype = new SettingsList();

  proto.setActive = function sg_setActive(active) {
    // no matter activate or not, we should reselect the dom node.
    this.selectionBorder.select(this.spatialNavigation.getFocusedElement());
  };

  proto.init = function sg_init(dom, lazyDOMId) {
    this.container = dom;
    SettingsList.prototype.init.apply(this,
                                      [document.getElementById(lazyDOMId)]);
  };

  exports.SettingsGroup = SettingsGroup;
})(window);
