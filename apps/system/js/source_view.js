/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SourceView = {
  get viewer() {
    return document.getElementById('appViewsource');
  },

  get active() {
    return !this.viewer ? false : this.viewer.style.visibility === 'visible';
  },

  init: function sv_init() {
    window.addEventListener('keyup', this);
  },

  show: function sv_show() {
    var viewsource = this.viewer;
    if (!viewsource) {
      var style = '#appViewsource { ' +
                  '  position: absolute;' +
                  '  top: -moz-calc(10%);' +
                  '  left: -moz-calc(10%);' +
                  '  width: -moz-calc(80% - 2 * 15px);' +
                  '  height: -moz-calc(80% - 2 * 15px);' +
                  '  visibility: hidden;' +
                  '  margin: 15px;' +
                  '  background-color: white;' +
                  '  opacity: 0.92;' +
                  '  color: black;' +
                  '  z-index: 9999;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      viewsource = document.createElement('iframe');
      viewsource.id = 'appViewsource';
      document.body.appendChild(viewsource);

      window.addEventListener('locked', this);
    }

    var url = WindowManager.getDisplayedApp();
    if (!url)
      // Assume the home screen is the visible app.
      url = window.location.toString();
    viewsource.src = 'view-source: ' + url;
    viewsource.style.visibility = 'visible';
  },

  hide: function sv_hide() {
    var viewsource = this.viewer;
    if (viewsource) {
      viewsource.style.visibility = 'hidden';
      viewsource.src = 'about:blank';
    }
  },

  toggle: function sv_toggle() {
    this.active ? this.hide() : this.show();
  },

  handleEvent: function sv_handleEvent(evt) {
    switch (evt.type) {
      case 'locked':
        this.hide();
        break;

      case 'keyup':
        if (!ScreenManager.screenEnabled ||
            evt.keyCode !== evt.DOM_VK_CONTEXT_MENU)
          return;

        this.toggle();
        break;
    }
  }
};
