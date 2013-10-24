(function(global) {
  'use strict';

  function EventList(rootElement) {
    this.element = rootElement;
  }

  EventList.prototype = {
    get list() {
      // XXX: I am tempted to abstract this much further
      this._list =
        this._list || this.element.querySelector('.items');

      return this._list;
    },

    itemFactory: function(item) {
      this._itemTemplate =
        this._itemTemplate || this.element.querySelector('.tpl-item').innerHTML;

      // XXX: this is insanely brittle and actually illustrates the difficulty of
      // templates?
      return this._itemTemplate.
        replace('%s', item.id).
        replace('%s', item.name);
    },

    addItem: function(object) {
      this.list.insertAdjacentHTML('beforeend', this.itemFactory(object));
    }
  };
  
  global.EventList = EventList;
}(this));
