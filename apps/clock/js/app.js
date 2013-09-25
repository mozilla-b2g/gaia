define(function(require) {
'use strict';

var Tabs = require('tabs');
var View = require('view');
var Panel = require('panel');
var TimerPanel = require('timer_panel');
var StopwatchPanel = require('stopwatch_panel');
var mozL10n = require('l10n');
var rAF = mozRequestAnimationFrame || requestAnimationFrame;
/**
 * Global Application event handling and paging
 */
var App = {
  panelClass: {
    'alarm-panel': Panel,
    'alarm-edit-panel': Panel,
    'timer-panel': TimerPanel,
    'stopwatch-panel': StopwatchPanel
  },

  /**
   * Load the Tabs and Panels, attach events and navigate to the default view.
   */
  init: function() {
    this.tabs = new Tabs(document.getElementById('clock-tabs'));
    this.tabs.on('selected', this.navigate.bind(this));

    window.addEventListener('hashchange', this);
    window.addEventListener('localized', this);
    window.addEventListener('visibilitychange', this);

    // we wait for the app to be l10n ready before initializing, so call
    // the onlocalized once at startup
    this.onlocalized();

    this.visible = !document.hidden;
    this.panels = Array.prototype.map.call(
      document.querySelectorAll('.panel'),
      function(element) {
        return View.instance(element, App.panelClass[element.id] || Panel);
      }
    );
    this.navigate({ hash: '#alarm-panel' });
    return this;
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
      if ('#' + panel.id === data.hash) {
        panel.active = true;
        panel.visible = true;
        if (currentIndex !== -1) {
          var direction = currentIndex < panelIndex;
          rAF(function startAnimation(oldPanel) {
            panel.transition =
              direction ? 'slide-in-right' : 'slide-in-left';

            oldPanel.transition =
              direction ? 'slide-out-left' : 'slide-out-right';
          }.bind(null, this.currentPanel));
        }
        this.currentPanel = panel;
      } else {
        panel.active = false;
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
