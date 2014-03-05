define(function(require) {
'use strict';

var Tabs = require('tabs');
var View = require('view');
var mozL10n = require('l10n');
var rAF = mozRequestAnimationFrame || requestAnimationFrame;
/**
 * Global Application event handling and paging
 */
var App = {
  /**
   * Load the Tabs and Panels, attach events and navigate to the default view.
   */
  init: function() {
    this.tabs = new Tabs(document.getElementById('clock-tabs'));

    window.addEventListener('hashchange', this);
    window.addEventListener('localized', this);
    window.addEventListener('visibilitychange', this);

    // we wait for the app to be l10n ready before initializing, so call
    // the onlocalized once at startup
    this.onlocalized();

    this.visible = !document.hidden;
    this.panels = Array.prototype.map.call(
      document.querySelectorAll('[data-panel-id]'),
      function(element) {
        var panel = {
          el: element,
          fragment: element.dataset.panelId.replace('_', '-') + '-panel',
          instance: null
        };

        return panel;
      }.bind(this)
    );
    this.navigate({ hash: '#alarm-panel' });
    return this;
  },

  /**
   * Load and instantiate the specified panel (when necessary).
   *
   * @param {Object} panel - An object describing the panel. It must contain
   *                         either an `el` attribute (defining the panel's
   *                         containing element) or an `instance` attribute
   *                         (defining the instantiated Panel itself).
   * @param {Function} [callback] - A function that will be invoked with the
   *                                instantiated panel once it is loaded.
   */
  loadPanel: function(panel, callback) {
    if (panel.instance) {
      callback && setTimeout(callback, 0, panel);
      return;
    }

    var moduleId = 'panels/' + panel.el.dataset.panelId + '/main';

    require([moduleId], function(PanelModule) {
      panel.instance = View.instance(panel.el, PanelModule);
      callback && callback(panel);
    });
  },

  /**
   * split each event handler into it's own method
   */
  handleEvent: function(event) {
    var handler = this['on' + event.type];
    if (handler) {
      return handler.apply(this, arguments);
    }
  },

  /**
   * navigate between pages.
   *
   * @param {object} data Options for navigation.
   * @param {string} data.hash The hash of the panel id.  I.E. '#alarm-panel'.
   */
  navigate: function(data) {
    var currentIndex = this.panels.indexOf(this.currentPanel);

    this.panels.forEach(function(panel, panelIndex) {
      if ('#' + panel.fragment === data.hash) {
        this.loadPanel(panel, function() {
          var instance = panel.instance;
          if (typeof data.data !== 'undefined') {
            instance.navData = data.data;
          }
          instance.active = true;
          instance.visible = true;
          if (currentIndex !== -1) {
            var direction = currentIndex < panelIndex;
            rAF(function startAnimation(oldPanel) {
              instance.transition =
                direction ? 'slide-in-right' : 'slide-in-left';

              oldPanel.instance.transition =
                direction ? 'slide-out-left' : 'slide-out-right';
            }.bind(null, this.currentPanel));
          }
          this.currentPanel = panel;
        }.bind(this));
      } else {
        if (panel.instance) {
          panel.instance.active = false;
        }
      }
    }, this);
    this.currentHash = data.hash;
  },

  /**
   * Navigate to the new hash.
   */
  onhashchange: function(event) {
    if (this.currentHash === location.hash) {
      return;
    }
    this.navigate({ hash: location.hash });
  },

  /**
   * Reset the global localization params on the html element.  Called when
   * the language changes, and once on application startup.
   */
  onlocalized: function(event) {
    document.documentElement.lang = mozL10n.language.code;
    document.documentElement.dir = mozL10n.language.direction;
  },

  /**
   * Whenever the application gains/loses focus, inform the current panel of
   * its visibility loss.
   */
  onvisibilitychange: function(event) {
    this.visible = !document.hidden;
    if (this.currentPanel) {
      this.currentPanel.visible = this.visible;
    }
  }
};

return App;

});
