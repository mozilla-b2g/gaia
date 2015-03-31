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
    this._elements = elements;
  }

  /**
   * Render details of an app to the UI elements.
   *
   * @access public
   * @memberOf AddonDetails.prototype
   * @param {App} app
   */
  AddonDetails.prototype.render = function render(app) {
    var l10n = navigator.mozL10n;
    var manifest =
      new ManifestHelper(app.instance.manifest || app.instance.updateManifest);

    // Display the name of the add-on in the panel header
    var appnameArgs = { appName: manifest.name };
    l10n.setAttributes(
      this._elements.header, 'addon-details-header', appnameArgs);

    // Put an icon next to the description
    navigator.mozApps.mgmt.getIcon(app, PREFERRED_ICON_SIZE).then((blob) => {
      this._elements.icon.src = URL.createObjectURL(blob);
    }).catch(() => {
      this._elements.icon.src = '../style/images/default.png';
    });
    l10n.setAttributes(this._elements.icon, 'accessible-app-icon', appnameArgs);

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
      l10n.setAttributes(this._elements.developer, 'addon-developer', {
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
        names.push(manifest.name);
      });

      names.sort();

      names.forEach((name) => {
        var item = document.createElement('li');
        var para = document.createElement('p');
        para.textContent = name;
        item.appendChild(para);
        this._elements.targetsList.appendChild(item);
      });

      if (names.length === 0) {
        this._elements.targetsList.hidden = true;
        this._elements.noTargetsMsg.hidden = false;
      } else {
        this._elements.targetsList.hidden = false;
        this._elements.noTargetsMsg.hidden = true;
      }
    });
  };

  return function ctor_addon_details(panel) {
    return new AddonDetails(panel);
  };
});
