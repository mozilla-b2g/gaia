/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var TTLView = {
  element: null,

  get visible() {
    return this.element && this.element.style.display === 'block';
  },

  hide: function tv_hide() {
    if (this.element)
      this.element.style.visibility = 'hidden';

    window.removeEventListener('appwillopen', this);
    window.removeEventListener('apploadtime', this);
    window.removeEventListener('activitywillopen', this);
    window.removeEventListener('activityloadtime', this);
  },

  show: function tv_show() {
    if (!this.element)
      this.createElement();
    this.element.style.visibility = 'visible';

    // this is fired when the app launching is initialized
    window.addEventListener('appwillopen', this);
    window.addEventListener('apploadtime', this);

    // this is to calculate the load time of inline activity
    window.addEventListener('activitywillopen', this);
    window.addEventListener('activityloadtime', this);
  },

  createElement: function tv_createElement() {
    var element = document.createElement('div');
    element.id = 'debug-ttl';
    element.innerHTML = '00000';
    element.dataset.zIndexLevel = 'debug-ttl';

    this.element = element;
    document.getElementById('screen').appendChild(element);
  },

  handleEvent: function tv_handleEvent(evt) {
    switch (evt.type) {
      case 'apploadtime':
      case 'activityloadtime':
        this.updateLoadtime(evt.detail.time, evt.detail.type);
        break;

      case 'appwillopen':
      case 'activitywillopen':
        this.resetLoadtime();
        break;
    }
  },

  resetLoadtime: function tv_resetLoadtime() {
    if (!this.element)
      this.createElement();
    this.element.innerHTML = '00000';
  },

  updateLoadtime: function tv_updateLoadtime(time, type) {
    if (!this.element)
      this.createElement();
    this.element.innerHTML = time + ' [' + type + ']';
  },

  toggle: function tv_toggle() {
    this.visible ? this.hide() : this.show();
  }
};

SettingsListener.observe('debug.ttl.enabled', false, function(value) {
  !!value ? TTLView.show() : TTLView.hide();
});

