/**
 * DialogManager is a singleton that will help DialogService to load panels
 * and control any transitions on panels.
 *
 * API:
 *
 * DialogManager.open(dialog, options);
 * DialogManager.close(dialog, options);
 *
 * @module DialogManager
 */
define(function(require) {
  'use strict';

  var PanelCache = require('modules/panel_cache');
  var LazyLoader = require('shared/lazy_loader');

  var DialogManager = function() {
    this.OVERLAY_SELECTOR = '.settings-dialog-overlay';

    this._overlayDOM = document.querySelector(this.OVERLAY_SELECTOR);
  };

  DialogManager.prototype = {
    /**
     * load panel based on passed in panelId
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} panelId
     * @return {Promise}
     */
    _loadPanel: function dm__loadPanel(panelId) {
      var promise = new Promise(function(resolve, reject) {
        var panelElement = document.getElementById(panelId);
        if (panelElement.dataset.rendered) { // already initialized
          resolve();
          return;
        }

        panelElement.dataset.rendered = true;

        // XXX remove SubPanel loader once sub panel are modulized
        if (panelElement.dataset.requireSubPanels) {
          // load the panel and its sub-panels (dependencies)
          // (load the main panel last because it contains the scripts)
          var selector = 'section[id^="' + panelElement.id + '-"]';
          var subPanels = document.querySelectorAll(selector);
          for (var i = 0, il = subPanels.length; i < il; i++) {
            LazyLoader.load([subPanels[i]]);
          }
          LazyLoader.load([panelElement], resolve);
        } else {
          LazyLoader.load([panelElement], resolve);
        }
      });
      return promise;
    },

    /**
     * promised version of mozL10n.once()
     *
     * @memberOf DialogManager
     * @access private
     * @return {Promise}
     */
    _initializedL10n: function dm__initializedL10n() {
      var promise = new Promise(function(resolve) {
        navigator.mozL10n.once(resolve);
      });
      return promise;
    },

    /**
     * promised version of PanelCache.get()
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} panelId
     * @return {Promise}
     */
    _getPanel: function dm__getPanel(panelId) {
      var promise = new Promise(function(resolve) {
        PanelCache.get(panelId, function(panel) {
          resolve(panel);
        });
      });
      return promise;
    },

    /**
     * this is used to control visibility of overlayDOM
     *
     * @memberOf DialogManager
     * @access private
     * @param {Boolean} show
     */
    _showOverlay: function dm__showOverlay(show) {
      this._overlayDOM.hidden = !show;
    },

    /**
     * It is used to control the timing of transitions so that we can make sure
     * whether animation is done or not.
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} method
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _transit: function dm__transit(method, dialog, options) {
      var promise = new Promise(function(resolve) {
        var panel = dialog.panel;

        panel.addEventListener('transitionend', function paintWait(evt) {
          if ((method === 'close' || method === 'open') &&
            evt.propertyName === 'visibility') {
              // After transition, we have to `hide` the panel, otherwise
              // the panel would still exist on the layer and would block
              // the scrolling event.
              if (method === 'close') {
                panel.hidden = true;
              }
              panel.removeEventListener('transitionend', paintWait);
              resolve();
          }
        });

        // Before transition, we have to `show` the panel, otherwise
        // the panel before applying transition class.
        if (method === 'open') {
          panel.hidden = false;
        }

        // We need to apply class later otherwise Gecko can't apply
        // this transition and 150ms is an approximate number after doing
        // several rounds of manual tests.
        setTimeout(function() {
          if (method === 'open') {
            // Let's unhide the panel first
            panel.classList.add('current');
          } else {
            panel.classList.remove('current');
          }
        }, 150);
      });
      return promise;
    },

    /**
     * Do necessary works to open panel like loading panel, doing transition
     * and call related functions.
     *
     * @memberOf DialogManager
     * @access private
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _open: function dm__open(dialog, options) {
      var self = this;
      var foundPanel;

      return Promise.resolve()
      .then(function() {
        // 1: load panel
        return self._loadPanel(dialog.panel.id);
      })
      .then(function() {
        // 2: l10n is ready
        return self._initializedL10n();
      })
      .then(function() {
        // 3: Get that panel
        return self._getPanel(dialog.panel.id);
      })
      .then(function(panel) {
        // 4: call beforeShow
        foundPanel = panel;
        return foundPanel.beforeShow(dialog.panel, options);
      })
      .then(function() {
        // 5. UI stuffs + transition
        dialog.init();
        dialog.initUI();
        dialog.bindEvents();

        if (dialog.TRANSITION_CLASS === 'zoom-in-80') {
          self._showOverlay(true);
        }

        return self._transit('open', dialog, options);
      })
      .then(function() {
        // 6. show that panel as a dialog
        return foundPanel.show(dialog.panel, options);
      });
    },

    /**
     * Do necessary works to close panel like loading panel, doing transition
     * and call related functions.
     *
     * @memberOf DialogManager
     * @access private
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _close: function dm__close(dialog, options) {
      var self = this;
      var foundPanel;
      var cachedResult;

      return Promise.resolve()
      .then(function() {
        // 1: Get that panel
        return self._getPanel(dialog.panel.id);
      })
      .then(function(panel) {
        // 2: Let's validate to see whether we can close this dialog or not.
        foundPanel = panel;

        var promise;
        // custom dialog - onSubmit
        if (foundPanel.onSubmit && options._type === 'submit') {
          promise = foundPanel.onSubmit();
        // custom dialog - onCancel
        } else if (foundPanel.onCancel && options._type === 'cancel') {
          promise = foundPanel.onCancel();
        // if no onSubmit & onCancel, pass directly
        } else {
          promise = Promise.resolve();
        }

        return promise;
      })
      .then(function(result) {
        cachedResult = result;

        // 3: call beforeHide
        return foundPanel.beforeHide();
      })
      .then(function() {
        // 4. transition
        return self._transit('close', dialog, options);
      })
      .then(function() {
        // 5. call hide
        return foundPanel.hide();
      })
      .then(function() {
        // 6. Get result and cleanup dialog
        var result;

        // for prompt dialog, we have to get its own result from input text.
        if (dialog.DIALOG_CLASS === 'prompt-dialog') {
          result = dialog.getResult();
        } else if (cachedResult) {
          result = cachedResult;
        }

        dialog.cleanup();

        if (dialog.TRANSITION_CLASS === 'zoom-in-80') {
          self._showOverlay(false);
        }

        return result;
      });
    },

    /**
     * It is a bridge to call open or close function.
     *
     * @memberOf DialogManager
     * @access private
     * @param {String} method
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    _navigate: function dm__navigate(method, dialog, options) {
      method = (method === 'open') ? '_open' : '_close';
      return this[method](dialog, options);
    },

    /**
     * DialogService would use this exposed API to open dialog.
     *
     * @memberOf DialogManager
     * @access public
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    open: function dm_open(dialog, options) {
      return this._navigate('open', dialog, options);
    },

    /**
     * DialogService would use this exposed API to close dialog.
     *
     * @memberOf DialogManager
     * @access public
     * @param {BaseDialog} dialog
     * @param {Object} options
     * @return {Promise}
     */
    close: function dm_close(dialog, type, options) {
      options._type = type;
      return this._navigate('close', dialog, options);
    }
  };

  var dialogManager = new DialogManager();
  return dialogManager;
});
