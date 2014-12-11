/* global evt */
(function(exports) {
  'use strict';

  function CardFilter() {}

  CardFilter.FILTERS = Object.freeze({
    'ALL': 'filter',
    'TV': 'tv',
    'DASHBOARD': 'dashboard',
    'DEVICE': 'device',
    'APPLICATION': 'application'
  });

  var proto = CardFilter.prototype = new evt();

  Object.defineProperty(proto, 'filter', {
    get: function cf_getFilter() {
      return this._selectedFilter;
    },
    set: function cf_setFilter(icon) {
      if (this.menuGroup && this._buttons[icon]) {
        if (this._buttons[this._selectedFilter]) {
          this._buttons[this._selectedFilter].classList.remove('toggled');
        }
        this._selectedFilter = icon;
        this.menuGroup.changeIcon(icon);
        this._buttons[icon].classList.add('toggled');
        this.emit('filterchanged', icon);
      }
    }
  });

  proto.start = function cf_start(menuGroup) {
    this.menuGroup = menuGroup;
    var buttons = this.menuGroup.querySelectorAll(
                                                'smart-button[data-icon-type]');
    this._buttons = {};
    for (var i = 0; i < buttons.length; i++) {
      this._buttons[buttons[i].dataset.iconType] = buttons[i];
      buttons[i].addEventListener('click', this);
    }
  };

  proto.stop = function cf_stop() {
    this.menuGroup.removeEventListener('click', this);
  };

  proto.handleEvent = function cf_handleEvent(evt) {
    if (!evt.target.dataset.iconType) {
      return;
    }
    this.filter = evt.target.dataset.iconType;
  };

  exports.CardFilter = CardFilter;

})(window);
