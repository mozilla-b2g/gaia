/* global LazyLoader, InitialPanelHandler, RootPanelHandler, AppStarter */
/* exported InitialPanelHandler, RootPanelHandler, AppStarter */

/**
 * InitialPanelHandler provides basic interaction including navigation and
 * toggling settings before requirejs and other settings service get loaded.
 * This could increase the responsiveness of the settings app.
 *
 * @module InitialPanelHandler
 */
(function(exports) {
  'use strict';

  /**
   * @class InitialPanelHandler
   * @param {HTMLElement} rootElement
   *                      Root element of the panel.
   * @param {Function} customPanelHandlerFunc
   *                   Additional custom handler for the panel.
   * @returns {InitialPanelHandler}
   */
  function InitialPanelHandler(rootElement, customPanelHandlerFunc) {
    this._rootElement = rootElement;
    this._pendingTargetPanel = null;
    this._anchors = [];
    this._inputs = [];
    this._inputListenerInfos = [];
    this._settings = navigator.mozSettings;

    if (this._settings) {
      this._init();
      if (typeof customPanelHandlerFunc !== 'undefined') {
        customPanelHandlerFunc(rootElement);
      }
    }
  }

  InitialPanelHandler.prototype = {
    /**
     * The panel that a user click on before the core modules are loaded.
     *
     * @access public
     * @memberOf InitialPanelHandler.prototype
     * @type {HTMLElement}
     */
    get pendingTargetPanel() {
      return this._pendingTargetPanel;
    },

    /**
     * Add click listeners to all list items with "href" attribute.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     */
    _addClickListeners: function iph_addClickListeners() {
      this._anchors = Array.prototype.slice.call(
        this._rootElement.querySelectorAll('li a[href]'));
      this._anchors.forEach(function(anchor) {
        anchor.onclick = (event) => {
          event.preventDefault();
          this._pendingTargetPanel = anchor.getAttribute('href');
          this._pendingTargetPanel = this._pendingTargetPanel.replace('#', '');
        };
      }, this);
    },

    /**
     * Remove click listeners added in _addClickListeners.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     */
    _removeClickListeners: function iph_removeClickListeners() {
      this._anchors.forEach(function(anchor) {
        anchor.onclick = null;
      });
    },

    /**
     * Add listeners added to all input elements bound to the settings database.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     */
    _addInputListeners: function iph_addInputListeners() {
      this._inputs = Array.prototype.slice.call(
        this._rootElement.querySelectorAll('input[name]'));
      this._inputs.forEach(function(input) {
        var name = input.getAttribute('name');
        var boundOnSettingChange = this._onSettingChange.bind(this, input);

        input.onchange = this._onInputChange.bind(this);

        this._settings.createLock().get(name).then((result) => {
          this._updateInput(input, result[name]);
        });

        this._settings.addObserver(name, boundOnSettingChange);
        this._inputListenerInfos.push({
          name: name,
          handler: boundOnSettingChange
        });
      }, this);
    },

    /**
     * Remove the listeners added in _addInputListeners.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     */
    _removeInputListeners: function iph_removeInputListeners() {
      this._inputs.forEach(function(input) {
        input.onchange = null;
      });
      this._inputListenerInfos.forEach(function(inputListenerInfo) {
        this._settings.removeObserver(inputListenerInfo.name,
          inputListenerInfo.handler);
      }, this);
    },

    /**
     * Handler for settings field changes.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     * @param {HTMLInputElement} input
     * @param {Event} event                    
     */
    _onSettingChange: function uph_onSettingChange(input, event) {
      this._updateInput(input, event.settingValue);
    },

    /**
     * Handler for input changes. It updates the chage to the settings database.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     * @param {Event} event                    
     */
    _onInputChange: function uph_onInputChange(event) {
      var input = event.target;
      var type = input.type;
      var key = input.name;

      if (!key || event.type !== 'change') {
        return;
      }

      // Not touching <input> with data-setting attribute here
      // because they would have to be committed with a explicit "submit"
      // of their own dialog.
      if (input.dataset.setting) {
        return;
      }

      var value;
      switch (type) {
        case 'checkbox':
        case 'switch':
          value = input.checked; // boolean
          break;
        case 'range':
          // Bug 906296:
          //   We parseFloat() once to be able to round to 1 digit, then
          //   we parseFloat() again to make sure to store a Number and
          //   not a String, otherwise this will make Gecko unable to
          //   apply new settings.
          value = parseFloat(parseFloat(input.value).toFixed(1)); // float
          break;
        case 'select-one':
        case 'radio':
        case 'text':
        case 'password':
          value = input.value; // default as text
          if (input.dataset.valueType === 'integer') { // integer
            value = parseInt(value, 10);
          }
          break;
      }

      var cset = {};
      cset[key] = value;
      this._settings.createLock().set(cset);
    },

    /**
     * Update the input element with a value.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype
     * @param {HTMLInputElement} input
     * @param {Object} value                  
     */
    _updateInput: function uph_updateInput(input, value) {
      var i;
      var count;

      switch (input.type) {
        case 'checkbox':
        case 'switch':
          if (input.checked === value) {
            return;
          }
          input.checked = value;
          break;
        case 'range':
          if (input.value === value) {
            return;
          }
          input.value = value;
          break;
        case 'select':
          for (i = 0, count = input.options.length; i < count; i++) {
            if (input.options[i].value === value) {
              input.options[i].selected = true;
              break;
            }
          }
          break;
      }
    },

    /**
     * Add listeners for click and input changes.
     *
     * @access private
     * @memberOf InitialPanelHandler.prototype              
     */
    _init: function iph_init() {
      this._addClickListeners();
      this._addInputListeners();
    },

    /**
     * Release the control from the handler to the panel.
     *
     * @access public
     * @memberOf InitialPanelHandler.prototype              
     */
    release: function iph_release() {
      this._removeClickListeners();
      this._removeInputListeners();
    }
  };

  exports.InitialPanelHandler =
    function ctor_InitialPanelHandler(rootElement, customPanelHandler) {
      return new InitialPanelHandler(rootElement, customPanelHandler);
  };
})(window);


/**
 * RootPanelHandler updates UI elements in the root panel. 
 *
 * @module RootPanelHandler
 */
(function(exports) {
  'use strict';

  /**
   * @class RootPanelHandler
   * @param {HTMLElement} rootElement
   *                      Root element of the panel.
   * @returns {RootPanelHandler}
   */
  function RootPanelHandler(rootElement) {
    this._rootElement = rootElement;
    this._init();
  }

  RootPanelHandler.prototype = {
    /**
     * Update the sim related items based on mozMobileConnections.
     *
     * @access private
     * @memberOf RootPanelHandler.prototype
     */
    _updateSimItems: function rph_refrehsSimItems() {
      if (navigator.mozMobileConnections) {
        if (navigator.mozMobileConnections.length === 1) { // single sim
          document.getElementById('simCardManager-settings').hidden = true;
        } else { // dsds
          document.getElementById('simSecurity-settings').hidden = true;
        }
      } else {
        // hide telephony panels
        var elements = ['call-settings',
                        'data-connectivity',
                        'messaging-settings',
                        'simSecurity-settings',
                        'simCardManager-settings'];
        elements.forEach(function(el) {
          document.getElementById(el).hidden = true;
        });
      }
    },

    /**
     * Update the developer menu item based on the preference.
     *
     * @access private
     * @memberOf RootPanelHandler.prototype
     */
    _updateDeveloperMenuItem: function rph_refreshDeveloperMenuItem() {
      var item = this._rootElement.querySelector(
        '[data-show-name="developer.menu.enabled"]');
      if (item && navigator.mozSettings) {
        return navigator.mozSettings.createLock()
          .get('developer.menu.enabled').then(
            function(result) {
              item.hidden = !result['developer.menu.enabled'];
          }, function(error) {
            console.error(error);
          });
      } else {
        return Promise.resolve();
      }
    },

    /**
     * Process all UI elements here.
     *
     * @access private
     * @memberOf RootPanelHandler.prototype              
     */
    _init: function rph_init() {
      var nfcItem = this._rootElement.querySelector('.nfc-settings');
      nfcItem.hidden = !navigator.mozNfc;

      // Show proper SIM items.
      this._updateSimItems();

      // Show developer menu when necessary.
      this._updateDeveloperMenuItem();
    }
  };

  exports.RootPanelHandler = function ctor_rootPanelHandler(rootElement) {
    return new RootPanelHandler(rootElement);
  };
})(window);

/**
 * AppStarter determines the initial panel to be displayed for this launch. It
 * is also reponsible for attaching basic panel handlers for enabling the
 * ability of interacting with users.
 *
 * @module AppStarter
 */
(function(exports) {
  'use strict';

  /**
   * @class AppStarter
   * @returns {AppStarter}
   */
  function AppStarter() {
    this._started = false;
    this._launchContext = null;
  }

  AppStarter.prototype = {
    /**
     * Returns the initial panel id based on the pending system message. If
     * there is no system message available, it returns 'root'.
     *
     * @access private
     * @memberOf AppStarter.prototype
     * @returns {Promise String}
     */
    _getInitialPanelId: function as_getInitialPanelId() {
      return new Promise(function(resolve) {
        if (navigator.mozHasPendingMessage('activity')) {
          // Load activity handler only when we need to handle it.
          LazyLoader.load(['js/activity_handler.js'], function ah_loaded() {
            window.ActivityHandler.ready().then(function ah_ready() {
              resolve(window.ActivityHandler.targetPanelId);
            });
          });
        } else {
          resolve('root');
        }
      });
    },

    /**
     * Insert the elements of the initial panel.
     *
     * @access private
     * @memberOf AppStarter.prototype
     */
    _showInitialPanel: function as_showInitialPanel(initialPanelId) {
      var initialPanel = document.getElementById(initialPanelId);
      // Use lazy loade because it handles the case in DEBUG mode.
      return LazyLoader.load([initialPanel]).then(() => {
        initialPanel.classList.add('current');
      });
    },

    /**
     * The function defines a launch context storing the information regarding
     * the launch to be used by the AMD modules.
     *
     * @access private
     * @memberOf AppStarter.prototype
     */
    _createLaunchContext: function as_createLaunchContext(initialPanelId,
      initialPanelHandler, activityHandler) {

      this._launchContext = {
        get initialPanelId() {
          return initialPanelId;
        },
        get initialPanelHandler() {
          return initialPanelHandler;
        },
        get activityHandler() {
          return activityHandler;
        }
      };

      var that = this;
      Object.defineProperty(exports, 'LaunchContext', {
        configurable: true,
        get: function() {
          return that._launchContext;
        }
      });
    },

    /**
     * Load alameda and the required modules defined in main.js.
     *
     * @access private
     * @memberOf AppStarter.prototype
     */
    _loadAlameda: function as_loadAlameda() {
      var scriptNode = document.createElement('script');
      scriptNode.setAttribute('data-main', 'js/main.js');
      scriptNode.src = 'js/vendor/alameda.js';
      document.head.appendChild(scriptNode);
    },

    /**
     * The function determines the first panel to be displayed and loads the
     * minimal set of modules for basic interaction. It also exposes the launch
     * context for the delay loaded AMD modules.
     *
     * @access public
     * @memberOf AppStarter.prototype
     */
    start: function as_start() {
      if (this._started) {
        return Promise.resolve();
      } else {
        this._started = true;
      }

      navigator.mozL10n.once(function l10nDone() {
        // Since the settings app contains its chrome already existing in the
        // DOM, we can fire that it's loaded as soon as the DOM is localized
        window.performance.mark('navigationLoaded');
        window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

        // Since the settings app has no functional chrome, we can fire the
        // interactive event now because there are no events to bind
        window.performance.mark('navigationInteractive');
        window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
      });

      var initialPanelId;
      return this._getInitialPanelId().then((panelId) => {
        initialPanelId = panelId;
        return this._showInitialPanel(panelId);
      }).then(() => {
        // XXX: This is an optimization for the root panel to avoid reflow that
        //      could be observed by users.
        var customPanelHandler;
        if (initialPanelId === 'root') {
          customPanelHandler = RootPanelHandler;
        }

        var initialPanelHandler =
          InitialPanelHandler(document.getElementById(initialPanelId),
            customPanelHandler);

        // Initial panel handler registers basic events for interaction so we
        // can fire the content interactive evnet here.
        window.performance.mark('contentInteractive');
        window.dispatchEvent(new CustomEvent('moz-content-interactive'));

        this._createLaunchContext(initialPanelId, initialPanelHandler,
          window.ActivityHandler);
      }).then(() => {
        // Add timeout as loading the modules could block scrolling.
        return new Promise((resolve) => {
          setTimeout(() => {
            this._loadAlameda();
            resolve();
          }, 100);
        });
      });
    }
  };

  exports.AppStarter = function ctor_appStarter() {
    return new AppStarter();
  };
})(window);

(function() {
  'use strict';

  var appStarter = AppStarter();

  if (document.readyState !== 'loading') {
    appStarter.start();
  } else {
    document.addEventListener('readystatechange', function readyStateChange() {
      if (document.readyState == 'interactive') {
        document.removeEventListener('readystatechange', readyStateChange);
        appStarter.start();
      }
    });
  }
})();
