'use strict';
/* global evt, Base, LazyLoader, SelectionBorder, SpatialNavigator */
(function(exports) {

  function SettingsList() {
    this.bindSelf();
    this.menuItems = {};
  }

  var proto = SettingsList.prototype = new Base();

  proto.init = function sl_init(dom) {
    var self = this;

    this.panel = dom;
    this.selectionBorder = new SelectionBorder({
      multiple: false,
      foreground: true,
      container: document.body
    });

    LazyLoader.load(dom, function lazyLoaded() {
      // select all menu items
      var items = self.panel.querySelectorAll('a.menu-item');
      var item = null;
      for (var i = 0; i < items.length; i++) {
        item = items[i];
        item.addEventListener('click', self);
        self.menuItems[item.dataset.group] = item;
      }

      // init spatial navigation
      self.spatialNavigation = new SpatialNavigator(
                                                   self.nodeListToArray(items));
      self.spatialNavigation.on('focus', self.handleChoosed);
      self.spatialNavigation.on('unfocus', self.handleUnchoosed);
      self.spatialNavigation.focus();
    });
  };

  proto.handleEvent = function sl_handleEvent(evt) {
    switch(evt.type) {
      case 'click':
        this.handleChoosed(evt.target);
        evt.preventDefault();
        break;
    }
  };

  proto.handleChoosed = function sl_handleChoosed(dom) {
    if (!dom) {
      return;
    }
    this.selectionBorder.select(dom);
    dom.classList.add('focused');
    this.fire('itemChoosed', dom);
  };

  proto.handleUnchoosed = function sl_handleUnchoosed(dom) {
    if (!dom) {
      return;
    }
    dom.classList.remove('focused');
  };

  proto.move = function sl_move(direction) {
    this.spatialNavigation.move(direction);
  };

  proto.setVisible = function sl_setVisible(visible) {
    this.panel.hidden = !visible;
    if (!visible) {
      this.selectionBorder.deselectAll();
    }
  };

  proto.setActive = function sl_setActive(active) {
    if (active && this.spatialNavigation.getFocusedElement()) {
      this.selectionBorder.select(this.spatialNavigation.getFocusedElement());
    } else {
      this.selectionBorder.deselectAll();
    }
  };

  proto.confirmSelection = function sl_confirmSelection(key) {
    // A virtual function for overriding.
  };

  exports.SettingsList = SettingsList;
})(window);

