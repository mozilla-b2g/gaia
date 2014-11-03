/* global BaseModule */
'use strict';

(function() {
  var HierarchyManager = function() {};
  HierarchyManager.SERVICES = [
    'focus',
    'addHierarchy',
    'removeHierarchy'
  ];
  BaseModule.create(HierarchyManager, {
    name: 'HierarchyManager',
    EVENT_PREFIX: 'hierachy',
    _ui_list: null,
    _topMost: null,
    DEBUG: true,

    _start: function() {
      this._ui_list = [];
    },

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
      this.debug('before sorting...');
      this.printHierarchy();
      this._ui_list.sort(function(a, b) {
        return (a.HIERARCHY_PRIORITY < b.HIERARCHY_PRIORITY);
      });
      this.debug('after sorting...');
      this.printHierarchy();
      this._ui_list.some(function(module) {
        if (module.isActive()) {
          this._topMost = module;
          return true;
        }
      }, this);
      if (lastTopMost) {
        this.debug('last top most is ' + lastTopMost.name);
      }
      if (this._topMost) {
        this.debug('next top most is ' + this._topMost.name);
      }
      if (this._topMost !== lastTopMost) {
        this.publish('changed');
      }
    },

    printHierarchy: function() {
      this._ui_list.forEach(function(module, index) {
        this.debug(
          '[' + index + '] (' + module.HIERARCHY_PRIORITY +')' + module.name +
          ', active state = ' + module.isActive());
      }, this);
    },

    focus: function(module) {
      if (this._topMost !== module) {
        return;
      }
      module.focus();
    },

    _pre_handleEvent: function() {
      this.updateHierarchy();
      return false;
    },

    /**
     * This function is used for any UI module who wants to occupy the hierachy.
     */
    addHierarchy: function(module) {
      // We need a value to know the proirity.
      if (!module.HIERARCHY_PRIORITY || !module.isActive) {
        return;
      }
      if (this._ui_list.indexOf(module) >= 0) {
        return;
      }
      this._ui_list.push(module);
      window.addEventListener(module.EVENT_PREFIX + 'active', this);
      window.addEventListener(module.EVENT_PREFIX + 'inactive', this);
      this.updateHierarchy();
    },

    /**
     * Remove the module reference from the living UI list.
     */
    removeHierarchy: function(module) {
      this._ui_list.splice(this._ui_list.indexOf(module), 1);
      window.removeEventListener(module.EVENT_PREFIX + 'active', this);
      window.removeEventListener(module.EVENT_PREFIX + 'inactive', this);
      this.updateHierarchy();
    }
  });
}());
