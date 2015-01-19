'use strict';
/* global Base, KeyEvent, LazyLoader, SelectionBorder, SpatialNavigator */
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
      self.ready = true;
      self.fire('ready');
    });
  };

  proto.handleEvent = function sl_handleEvent(evt) {
    switch(evt.type) {
      case 'click':
        if (this.spatialNavigation.getFocusedElement() === evt.currentTarget) {
          this.simulateKeyEvent(KeyEvent.DOM_VK_RETURN);
        } else {
          this.spatialNavigation.focus(evt.currentTarget);
        }
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
    this.fire('itemChoosed', {
      'dom': dom
    });
  };

  proto.handleUnchoosed = function sl_handleUnchoosed(dom) {
    if (!dom) {
      return;
    }
    dom.classList.remove('focused');
    this.selectionBorder.deselectAll();
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
      this.handleChoosed(this.spatialNavigation.getFocusedElement());
    } else if (document.body.dataset.active === 'group') {
      this.handleUnchoosed(this.spatialNavigation.getFocusedElement());
    } else {
      this.handleChoosed(this.spatialNavigation.getFocusedElement());
    }
  };

  exports.SettingsList = SettingsList;
})(window);

