define(function(require) {
'use strict';
/* global IntlHelper */

var Tabs = require('tabs');
var View = require('view');



/**
 * Global Application event handling and paging
 */
var App = {
  /**
   * Load the Tabs and Panels, attach events and navigate to the default view.
   */
  init: function() {
    IntlHelper.define('digit-nopadding', 'number', {
      style: 'decimal',
      useGrouping: false
    });
    this.tabs = new Tabs(document.getElementById('clock-tabs'));

    window.addEventListener('hashchange', this);
    window.addEventListener('visibilitychange', this);
    // Tell audio channel manager that we want to adjust the alarm channel
    // if the user press the volumeup/volumedown buttons in Clock.
    if (navigator.mozAudioChannelManager) {
      navigator.mozAudioChannelManager.volumeControlChannel = 'alarm';
    }

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

    window.performance.mark('navigationLoaded');

    this.navigate({ hash: '#alarm-panel' }, function() {
      // Dispatch an event to mark when we've finished loading.
      // At this point, the navigation is usable, and the primary
      // alarm list tab has begun loading.
      window.performance.mark('navigationInteractive');
    }.bind(this));
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

  alarmListLoaded: function() {
    // Performance testing markers. See <https://bugzil.la/996038>.
    // At this point, the alarm list has been loaded, and all facets
    // of Clock are now interactive. The other panels are lazily
    // loaded when the user switches tabs.
    window.performance.mark('visuallyLoaded');
    window.performance.mark('contentInteractive');
    window.performance.mark('fullyLoaded');
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
   * @param {function} callback Callback to invoke when done.
   */
  navigate: function(data, callback) {
    var currentIndex = this.panels.indexOf(this.currentPanel);
    this.panels.forEach(function(panel, panelIndex) {
      if ('#' + panel.fragment === data.hash) {
        this.loadPanel(panel, function() {
          var instance = panel.instance;
          instance.navData = data.data || null;
          instance.active = true;
          instance.visible = true;
          if (currentIndex !== -1 && currentIndex !== panelIndex) {
            var direction = currentIndex < panelIndex;
            requestAnimationFrame(function startAnimation(oldPanel) {
              instance.transition =
                direction ? 'slide-in-right' : 'slide-in-left';

              oldPanel.instance.transition =
                direction ? 'slide-out-left' : 'slide-out-right';
            }.bind(null, this.currentPanel));
          }
          this.currentPanel = panel;
          callback && callback();
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
