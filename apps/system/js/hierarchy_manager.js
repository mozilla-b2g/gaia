/* global BaseModule */
'use strict';

(function() {
  var HierarchyManager = function() {};
  HierarchyManager.SERVICES = [
    'focus',
    'registerHierarchy',
    'unregisterHierarchy'
  ];
  HierarchyManager.STATES = [
    'getTopMostWindow',
    'getTopMostUI'
  ];
  HierarchyManager.EVENTS = [
    'home',
    'holdhome',
    'system-resize',
    'launchactivity',
    'mozChromeEvent',
    'windowopened',
    'windowclosed'
  ];
  BaseModule.create(HierarchyManager, {
    name: 'HierarchyManager',
    EVENT_PREFIX: 'hierarchy',
    _ui_list: null,
    _topMost: null,
    DEBUG: false,

    _start: function() {
      this._ui_list = [];
    },

    /**
     * Provide the top most window information.
     * Usually used by integration tests.
     * @return {AppWindow|undefined} The top most window instance.
     */
    getTopMostWindow: function() {
      var topMostWindowManager;
      this._ui_list.some(function(module) {
        if (module.getActiveWindow && module.isActive()) {
          topMostWindowManager = module;
          return true;
        }
      }, this);
      return topMostWindowManager &&
             topMostWindowManager.getActiveWindow() &&
             topMostWindowManager.getActiveWindow().getTopMostWindow();
    },

    getTopMostUI: function() {
      this.debug('getting top most...', this._topMost);
      return this._topMost;
    },

    /**
     * Predefined priorities per module by module name.
     * @type {Array}
     */
    PRIORITIES: [
      'OverlayWindowManager',
      'LogoManager',
      'AttentionWindowManager',
      'SecureWindowManager',
      'LockScreenWindowManager',
      'UtilityTray',
      'Rocketbar',
      'SystemDialogManager',
      'AppWindowManager',
      'TaskManager'
    ],

    _stop: function() {
      this._ui_list.forEach(function(module) {
        window.removeEventListener(module + 'active', this);
        window.removeEventListener(module + 'inactive', this);
      }, this);
      this._ui_list = [];
    },

    updateHierarchy: function() {
      if (this._ui_list.length === 0) {
        this.debug('no any module watching.');
        return;
      }
      var lastTopMost = this._topMost;
      this._topMost = null;
      var found = this._ui_list.some(function(module) {
        if (module.isActive()) {
          this.debug(module.name + ' is becoming active now.');
          this._topMost = module;
          return true;
        }
      }, this);

      if (this._topMost !== lastTopMost) {
        if (lastTopMost) {
          this.debug('last top most is ' + lastTopMost.name);
        } else {
          this.debug('last top most is null.');
        }
        if (found) {
          this.debug('next top most is ' + this._topMost.name);
        } else {
          this.debug('next top most is null.');
        }

        if (this._topMost && this._topMost.setHierarchy &&
            this._topMost.setHierarchy(true)) {
          // Blur previous module only when current module is successfully
          // focused.
          lastTopMost && lastTopMost.setHierarchy &&
          lastTopMost.setHierarchy(false);

        }

        this._topMost && this._topMost.setHierarchy &&
        this._topMost.setHierarchy(true);
        this.publish('changed');
      } else {
        this.debug('top most is the same.', this._topMost ?
          this._topMost.name : 'NaN');
      }
    },

    dumpHierarchy: function() {
      this._ui_list.forEach(function(module, index) {
        this.debug(
          '[' + index + '] (' +
            this.PRIORITIES.indexOf(module.name) +')' +
            module.name +
          ', active state = ' + module.isActive());
      }, this);
    },

    focus: function(module) {
      if (!module) {
        this._topMost.setHierarchy(true);
      } else if (this._topMost === module) {
        module.setHierarchy(true);
      }
    },

    updateTopMostWindow: function() {
      var topMostWindow = this.getTopMostWindow();
      if (topMostWindow !== this._topMostWindow) {
        this._topMostWindow = topMostWindow;
        this.publish('topmostwindowchanged');
      }
    },

    handleEvent: function(evt) {
      this.debug(evt.type);
      switch (evt.type) {
        case 'windowopened':
        case 'windowclosed':
          this.updateTopMostWindow();
          break;
        case 'mozChromeEvent':
          if (!evt.detail ||
              evt.detail.type !== 'inputmethod-contextchange') {
            break;
          }
          /* falls through */
        case 'home':
        case 'holdhome':
        case 'launchactivity':
        case 'webapps-launch':
        case 'system-resize':
          this.broadcast(evt);
          break;
        default:
          this.debug('handling ' + evt.type);
          this.updateHierarchy();
          break;
      }
      return false;
    },

    /**
     * Broadcast hierarchy based event until it's blocked
     * @param  {DOMEvent} evt Event to be broadcast
     */
    broadcast: function(evt) {
      this._ui_list.some(function(ui, index) {
        // The last one will always catch the event if
        // there is nobody block it.
        // This rule is for task manager who is inactive but
        // needs to catch holdhome event as no one else
        // needs this event. If task manager's hierarchy is changed
        // we may need to change this rule as well.
        if ((ui.isActive() || index === this._ui_list.length - 1) &&
            ui.respondToHierarchyEvent) {
          // If the module wants to interrupt the event,
          // it should return false in the broadcast function.
          this.debug('handover ' + evt.type + ' to ' + ui.name);
          return (ui.respondToHierarchyEvent(evt) !== true);
        }
      }, this);
    },

    /**
     * This function is used for any UI module who wants to occupy the hierachy.
     */
    registerHierarchy: function(module) {
      if (!module.isActive) {
        return;
      }
      if (this._ui_list.indexOf(module) >= 0) {
        return;
      }

      this.debug(module.name + ' is registering the hierarchy');
      this._ui_list.push(module);
      this.sortHierarchy();
      window.addEventListener(module.EVENT_PREFIX + '-activating', this);
      window.addEventListener(module.EVENT_PREFIX + '-activated', this);
      window.addEventListener(module.EVENT_PREFIX + '-deactivating', this);
      window.addEventListener(module.EVENT_PREFIX + '-deactivated', this);
      this.updateHierarchy();
    },

    sortHierarchy: function() {
      this.debug('before sorting...');
      this.dumpHierarchy();
      var self = this;
      this._ui_list.sort(function(a, b) {
        return (self.PRIORITIES.indexOf(b.name) <
                self.PRIORITIES.indexOf(a.name));
      });
      this.debug('after sorting...');
      this.dumpHierarchy();
    },

    /**
     * Remove the module reference from the living UI list.
     */
    unregisterHierarchy: function(module) {
      var index = this._ui_list.indexOf(module);
      if (index < 0) {
        return;
      }
      this.debug(module.name + ' is unregistering the hierarchy');
      var removed = this._ui_list.splice(index, 1);
      this.sortHierarchy();
      this.debug(removed.name);
      window.removeEventListener(module.EVENT_PREFIX + '-activated', this);
      window.removeEventListener(module.EVENT_PREFIX + '-deactivated', this);
      this.updateHierarchy();
    }
  });
}());
