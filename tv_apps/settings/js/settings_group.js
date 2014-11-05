'use strict';
/* global evt, Base, LazyLoader, SelectionBorder, SpatialNavigator */
(function(exports) {

  function nodeListToArray(obj) {
    return [].map.call(obj, function(element) {
      return element;
    })
  }

  function SettingsGroup(dom, lazyDOMId) {
    var self = this;
    this.bindSelf();
    LazyLoader.load(document.getElementById(lazyDOMId), function loaded() {
      self.fire('ready');
      self.ready = true;
    });
    this.panel = dom;
    this.menuItems = {};
  }

  var proto = SettingsGroup.prototype = new Base();

  proto.init = function sg_init() {
    this.selectionBorder = new SelectionBorder({
      multiple: false,
      foreground: true,
      container: document.body
    });
    // select all menu items
    var items = this.panel.querySelectorAll('a[data-group]');
    var item = null;
    for (var i = 0; i < items.length; i++) {
      item = items[i];
      item.addEventListener('click', this);
      this.menuItems[item.dataset.group] = item;
    }
    // init spatial navigation
    this.spatialNavigation = new SpatialNavigator(nodeListToArray(items));
    this.spatialNavigation.on('focus', this.choose);
    this.spatialNavigation.on('unfocus', this.unchoose);
    this.spatialNavigation.focus();
  };

  proto.handleEvent = function sg_handleEvent(evt) {
    switch(evt.type) {
      case 'click':
        if (evt.currentTarget.dataset.group) {
          this.choose(evt.target);
          evt.preventDefault();
        }
        break;
    }
  };

  proto.choose = function sg_choosed(dom) {
    this.selectionBorder.select(dom);
    dom.classList.add('focused');
    this.fire('itemChoosed', dom.dataset.group);
  };

  proto.unchoose = function sg_unchoosed(dom) {
    dom.classList.remove('focused');
  };

  proto.move = function sg_move(direction) {
    this.spatialNavigation.move(direction);
  };

  proto.setFocus = function sg_setFocus(f) {
    this.container.classList[f ? 'add' : 'remove']('focused');
  };

  exports.SettingsGroup = SettingsGroup;
})(window);
