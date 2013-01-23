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

      var start = 0;

      // this is fired when the app launching is initialized
      window.addEventListener('appwillopen', function willopen(e) {
        var frame = e.target;
        var iframe = frame.firstChild;

        frame.dataset.lastStart = performance.now();
        element.innerHTML = '00000';

        // unpainted means that the app is cold booting
        // if it is, we're going to listen for Browser API's loadend event
        // which indicates that the iframe's document load is complete
        //
        // if the app is not cold booting (is in memory) we will listen
        // to appopen event, which is fired when the transition to the
        // app window is complete.
        //
        // [w] - warm boot (app is in memory, just transition to it)
        // [c] - cold boot (app has to be booted, we show it's document load
        // time)
        var ev;
        if ('unpainted' in iframe.dataset) {
          ev = 'mozbrowserloadend';
        } else {
          ev = 'appopen';
        }

        frame.addEventListener(ev, function paint(e) {
          frame.removeEventListener(e.type, paint);
          var prefix;
          if (e.type == 'appopen') {
            prefix = ' [w]';
          } else {
            prefix = ' [c]';
          }
          var time = parseInt(performance.now() - frame.dataset.lastStart);
          element.innerHTML = time + prefix;
        });
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

