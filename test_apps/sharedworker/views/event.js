(function(global) {
  'use strict';

  function Event(rootElement) {
    this.element = rootElement;
  }

  Event.prototype = {
    eventFactory: function(item) {
      this._itemTemplate =
        this._itemTemplate || this.element.querySelector('.tpl-event').innerHTML;

      // XXX: this is insanely brittle and actually illustrates the difficulty of
      // templates?
      return this._itemTemplate.
        replace('%s', item.name);
    },

    setEvent: function(object) {
      var event = this.element.querySelector('.event');
      event.innerHTML = this.eventFactory(object);
    }
  };

  global.Event = Event;
}(this));
