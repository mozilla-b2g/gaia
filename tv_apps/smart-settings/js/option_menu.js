'use strict';
/* global Base, KeyEvent, SelectionBorder, SpatialNavigator */
(function(exports) {

  function OptionMenu() {
    this.bindSelf();
    this.menus = [];
  }

  var proto = OptionMenu.prototype = new Base();

  proto.addMenuItem = function om_addMenuItem(item) {
    this.menus.push(item);
  };

  proto.removeMenuItem = function om_removeMenuItem(item) {
    var idx = this.menus.indexOf(item);
    if (idx < 0) {
      return;
    }
    // remove item from list.
    this.menus.splice(idx, 1);
    // remove UI from container
    var ui = this.container.querySelector('.menu-item[data-key="' +
                                          item.key + '"]');
    if (ui) {
      this.container.removeChild(ui);
    }
  };

  proto.createMenu = function om_createMenu(item) {
    var self = this;
    var anchor = document.createElement('a');
    anchor.classList.add('menu-item');
    anchor.dataset.key = item.key;
    anchor.href = '#';
    anchor.addEventListener('click', function handleClick() {
      if (self.spatialNavigation.getFocusedElement() === anchor) {
        self.simulateKeyEvent(KeyEvent.DOM_VK_RETURN);
      } else {
        self.spatialNavigation.focus(anchor);
      }
    });
    var span = document.createElement('span');
    span.textContent = item.label;

    if (item.selected) {
      anchor.classList.add('selected');
    }

    anchor.appendChild(span);
    return anchor;
  };

  proto.renderAt = function om_renderAt(container) {
    this.selectionBorder = new SelectionBorder({
      multiple: false,
      foreground: true,
      container: document.body
    });

    this.container = container;
    var menuUIs = [];
    for(var i = 0; i < this.menus.length; i++) {
      menuUIs[i] = this.createMenu(this.menus[i]);
      if (this.menus[i].selected) {
        this.currentSelectedDOM = menuUIs[i];
      }
      container.appendChild(menuUIs[i]);
    }
    // init spatial navigation
    this.spatialNavigation = new SpatialNavigator(menuUIs);
    this.spatialNavigation.on('focus', this.handleChoosed);
    this.spatialNavigation.on('unfocus', this.handleUnchoosed);
  };

  proto.handleChoosed = function om_handleChoosed(dom) {
    if (!dom) {
      return;
    }
    this.selectionBorder.select(dom);
    dom.classList.add('focused');
    this.fire('itemChoosed', {
      'dom': dom
    });
  };

  proto.handleUnchoosed = function om_handleUnchoosed(dom) {
    if (!dom) {
      return;
    }
    dom.classList.remove('focused');
    this.selectionBorder.deselectAll();
  };

  proto.move = function om_move(direction) {
    this.spatialNavigation.move(direction);
  };

  proto.confirmSelection = function om_confirmSelection() {
    var dom = this.spatialNavigation.getFocusedElement();
    if (!dom) {
      return;
    }
    var menu = this.menus.find(function(item) {
      return item.key === dom.dataset.key;
    });
    this.fire('itemConfirmed', menu);
  };

  proto.stop = function om_stop() {
    this.container.innerHTML = '';
    this.menus = [];
    this.spatialNavigation.off('focus', this.handleChoosed);
    this.spatialNavigation.off('unfocus', this.handleUnchoosed);

    this.selectionBorder.deselectAll();

    delete this.spatialNavigation;
    delete this.selectionBorder;
  };

  proto.start = function om_start() {
    this.spatialNavigation.focus(this.currentSelectedDOM);
  };

  exports.OptionMenu = OptionMenu;
})(window);
