
'use strict';

var Apps = {
  events: ['keypress', 'unload'],
  handleEvent: function apps_handleEvent(evt) {
    switch (evt.type) {
      case 'keypress':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          break;
        evt.preventDefault();

        var event = document.createEvent("UIEvents");
        event.initUIEvent("appclose", true, true, window, 1);
        window.top.dispatchEvent(event);
        break;
      case 'unload':
        this.uninit();
        break;
    }
  },

  init: function apps_init() {
    var events = this.events;
    var count = events.length;
    for (var i = 0; i < count; i++)
      window.addEventListener(events[i], this, true);
  },

  uninit: function apps_uninit() {
    var events = this.events;
    var count = events.length;
    for (var i = 0; i < count; i++)
      window.removeEventListener(events[i], this, true);
  }
};

Apps.init();

