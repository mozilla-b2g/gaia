define(function(require) {
  'use strict';

  var ManifestHelper = require('shared/manifest_helper');
  var AddonManager = require('modules/addon_manager');

  const PREFERRED_ICON_SIZE = 64 * (window.devicePixelRatio || 1);

  /**
   * This module renders the information of an addon to the UI elements.
   *
   * @class AddonDetails
   * @requires module:shared/manifest_helper
   * @requires module:modules/addon_manager
   * @returns {AddonDetails}
   */
  function AddonDetails(elements) {
    this._boundUpdateEnabledState = this._updateEnabledState.bind(this);
    this._elements = elements;
    this._curApp = null;
  }

  /**
   * Update the enabled state of an addon.
   *
   * @access private
   * @memberOf AddonDetails.prototype
   * @param {Boolean} newState
   */
  AddonDetails.prototype._updateEnabledState = function _update(newState) {
    this._elements.enabledState
      .setAttribute('data-l10n-id', newState ? 'enabled' : 'disabled');
  };

  /**
   * Render details of an app to the UI elements.
   *
   * @access public
   * @memberOf AddonDetails.prototype
   * @param {JSON} options that contain:
   *        {Object}  app        Add-on to render
   *        {Boolean} isActivity A flag indicating if the panel is accessed
   *                             via activity handling.
   */
  AddonDetails.prototype.render = function render({app, isActivity}) {
    if (this._curApp !== null) {
      this._curApp.unobserve('enabled', this._boundUpdateEnabledState);
    }
    this._curApp = app;
    if (this._curApp) {
      this._curApp.observe('enabled', this._boundUpdateEnabledState);
      this._updateEnabledState(this._curApp.enabled);
    }

    var l10n = navigator.mozL10n;
    this.noRename = !isActivity || !AddonManager.canDelete(app);
    var manifest =
      new ManifestHelper(app.instance.manifest || app.instance.updateManifest);

    this._elements.body.classList.toggle('no-rename', this.noRename);
    this.updateNames(manifest);

    // Put an icon next to the description
    navigator.mozApps.mgmt.getIcon(app, PREFERRED_ICON_SIZE).then((blob) => {
      this._elements.icon.src = URL.createObjectURL(blob);
    }).catch(() => {
      this._elements.icon.src = '../style/images/default.png';
    });

    // Display the add-on description if there is one
    if (manifest.description) {
      // If we have a description, the ManifestHelper class returned the
      // best localized version from the manifest file.
      this._elements.description.removeAttribute('data-l10n-id');
      this._elements.description.textContent = manifest.description;
    } else {
      // If there is no description, then display "no description" or similar.
      this._elements.description
        .setAttribute('data-l10n-id', 'addon-no-description');
    }

    // Display the add-on developer name if there is one
    var developerName = manifest.developer && manifest.developer.name;
    if (developerName) {
      this._elements.developer.hidden = false;
      l10n.setAttributes(this._elements.developer, 'addon-developer-name', {
        developerName: developerName
      });
    } else {
      this._elements.developer.hidden = true;
    }

    // Get the list of targeted apps
    this._elements.targetsList.textContent = '';  // Clear any old content here
    AddonManager.getAddonTargets(app).then((targets) => {
      var names = [];
      targets.forEach(function(target) {
        var manifest =
          new ManifestHelper(target.manifest || target.updateManifest);
        names.push(manifest.displayName);
      });

      names.sort();

      if (names.length < 1) {
        this._elements.targetsList
          .setAttribute('data-l10n-id', 'addon-no-targets');
      } else {
        this._elements.targetsList.textContent = names.join(', ');
      }
    });
  };

  /**
   * Render app names where appropriate.
   *
   * @access public
   * @memberOf AddonDetails.prototype
   * @param {JSON} manifest
   */
  AddonDetails.prototype.updateNames = function _updateNames(manifest) {
    // Display the name of the add-on in the panel header
    var appnameArgs = { appName: manifest.name };
    var l10n = navigator.mozL10n;

    l10n.setAttributes(
      this._elements.header, 'addon-details-header1', appnameArgs);
    l10n.setAttributes(
      this._elements.name, 'addon-details-header1', appnameArgs);
    // Put text description for an icon
    l10n.setAttributes(this._elements.icon, 'accessible-app-icon', appnameArgs);
  };

  return function ctor_addon_details(panel) {
    return new AddonDetails(panel);
  };
});
