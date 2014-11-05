/**
 * HomescreenItem is used to handle the visibility of this menuItem
 *
 * @module HomescreenItem
 */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');

  var HomescreenItem = function(element) {
    this._itemEnabled = false;
    this._element = element;
    this._boundToggleHomescreenSection =
      this._updateHomescreenSection.bind(this);
  };

  HomescreenItem.prototype = {
    /**
     * Set the current status of HomescreenItem
     * 
     * @access public
     * @param {Boolean} value
     * @memberOf HomescreenItem
     */
    set enabled(value) {
      if (this._itemEnabled === value) {
        return;
      } else {
        this._itemEnabled = value;
        if (this._itemEnabled) {
          this._boundToggleHomescreenSection();
          AppsCache.addEventListener('oninstall',
            this._boundToggleHomescreenSection);
          AppsCache.addEventListener('onuninstall',
            this._boundToggleHomescreenSection);
        } else {
          AppsCache.removeEventListener('oninstall',
            this._boundToggleHomescreenSection);
          AppsCache.removeEventListener('onuninstall',
            this._boundToggleHomescreenSection);
        }
      }
    },

    /**
     * Get the current status of HomescreenItem
     *
     * @access public
     * @memberOf HomescreenItem
     */
    get enabled() {
      return this._itemEnabled;
    },

    /**
     * Toggle the visibility of homescreen menuItem
     *
     * @access private
     * @memberOf HomescreenItem
     * @return {Promise}
     */
    _updateHomescreenSection: function h__updateHomescreenSection() {
      var self = this;
      return AppsCache.apps().then(function(apps) {
        var homescreenApps = self._getHomescreenApps(apps);
        if (homescreenApps.length < 2) {
          self._element.hidden = true;
        } else {
          self._element.hidden = false;
        }
      });
    },

    /**
     * Get homescreen related apps
     *
     * @access private
     * @param {Array.<Object>} apps - all installed apps
     * @memberOf HomescreenItem
     * @return {Array.<Object>} homescreen apps
     */
    _getHomescreenApps: function h__getHomescreenApps(apps) {
      return apps.filter(function(app) {
        var manifest = app.manifest || app.updateManifest;
        var role = manifest && manifest.role;
        return role === 'homescreen';
      });
    }
  };
  
  return function ctor_homescreenItem(element) {
    return new HomescreenItem(element);
  };
});
