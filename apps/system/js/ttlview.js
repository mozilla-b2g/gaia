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
  },

  show: function tv_show() {
    var element = this.element;
    if (!element) {
      element = document.createElement('div');
      element.id = 'debug-ttl';
      element.innerHTML = '00000';
      element.dataset.zIndexLevel = 'debug-ttl';

      this.element = element;
      document.getElementById('screen').appendChild(element);

      // this is fired when the app launching is initialized
      window.addEventListener('appwillopen', function willopen(e) {
        element.innerHTML = '00000';
      });

      window.addEventListener('apploadtime', function apploadtime(e) {
        element.innerHTML = e.detail.time + ' [' + e.detail.type + ']';
      });
    }

    element.style.visibility = 'visible';
  },

  toggle: function tv_toggle() {
    this.visible ? this.hide() : this.show();
  }
};

SettingsListener.observe('debug.ttl.enabled', false, function(value) {
  !!value ? TTLView.show() : TTLView.hide();
});

