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
    window.addEventListener('home+volume', function() {
        if (ScreenManager.screenEnabled)
          SourceView.toggle();
      });
    window.addEventListener('locked', function() {
        SourceView.hide();
      });
  },

  show: function sv_show() {
    var viewsource = this.viewer;
    if (!viewsource) {
      var style = '#appViewsource { ' +
                  '  position: absolute;' +
                  '  top: calc(10%);' +
                  '  left: calc(10%);' +
                  '  width: calc(80% - 2 * 1.5rem);' +
                  '  height: calc(80% - 2 * 1.5rem);' +
                  '  visibility: hidden;' +
                  '  margin: 1.5rem;' +
                  '  background-color: white;' +
                  '  opacity: 0.92;' +
                  '  color: black;' +
                  '  z-index: 9999;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      viewsource = document.createElement('iframe');
      viewsource.id = 'appViewsource';
      document.body.appendChild(viewsource);
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
  }
};
