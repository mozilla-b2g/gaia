/**
 * App List module.
 *
 * @module AppList
 * @return {Object}
 */
define([], function() {
  'use strict';

  var _ = navigator.mozL10n.get;
  var _lang = navigator.mozL10n.language.code;


  /**
   * Supported application sorting methods:
   * by name, by trust level, by developer name.
   * Note: sorting by name works for permissions as well.
   */
  var _orderBy = {
    name: (a, b) => a.name.localeCompare(b.name, _lang), // default
    trust: (a, b) => a.trust > b.trust, // 'certified', 'privileged', 'web'
    vendor: (a, b) => a.vendor.localeCompare(b.vendor, _lang)
  };


  /****************************************************************************
   * Applications - private helpers
   */

  var _applications = []; // array of {DOMApplication} representations
  var _defaultIconURL = '../style/images/default.png';

  /**
   * Get the list of installed apps.
   */
  function _getApplications(onsuccess, onerror) {
    onsuccess = typeof onsuccess === 'function' ? onsuccess : function() {};
    onerror = typeof onerror === 'function' ? onerror : function() {};

    var mozAppsMgmt = navigator.mozApps && navigator.mozApps.mgmt;
    if (!mozAppsMgmt) {
      console.error('navigator.mozApps.mgmt is undefined');
      onerror();
      return;
    }

    var req = mozAppsMgmt.getAll();
    req.onerror = onerror;
    req.onsuccess = event => {
      _applications = event.target.result.map(_makeAppRepresentation)
                                         .sort(_orderBy.name);
      onsuccess();
    };
  }

  /**
   * Get the app icon that best suits the device display size.
   */
  function _getBestIconURL(app) {
    var icons = (app.manifest || app.updateManifest).icons;
    if (!icons || !Object.keys(icons).length) {
      return _defaultIconURL;
    }

    // The preferred size is 30 pixels by default.
    // On an HDPI device, we may use a larger size than 30 * 1.5 = 45 pixels.
    var preferredIconSize = 30 * (window.devicePixelRatio || 1);
    var preferredSize = Number.MAX_VALUE;
    var max = 0;

    for (var size in icons) {
      size = parseInt(size, 10);
      if (size > max) {
        max = size;
      }
      if (size >= preferredIconSize && size < preferredSize) {
        preferredSize = size;
      }
    }

    // If there is an icon matching the preferred size, we return the result,
    // if there isn't, we will return the maximum available size.
    if (preferredSize === Number.MAX_VALUE) {
      preferredSize = max;
    }

    var url = icons[preferredSize];
    if (!url) {
      return _defaultIconURL;
    }
    return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
  }

  /**
   * Create a representation of a {DOMApplication} instance.
   *   .name:        localized name
   *   .trust:       trust level (= certified, privileged, web)
   *   .vendor:      developer name
   *   .iconURL:     URL of the best icon for the current display
   *   .permissions: filtered list of permissions that are actually used
   *   .manifest:    application manifest
   *   .origin:      application origin
   */
  function _makeAppRepresentation(app) {
    var manifest = app.manifest || app.updateManifest || {};

    var trust = 'web';
    if (manifest.type === 'certified' || manifest.type === 'privileged') {
      trust = manifest.type;
    }

    var name = manifest.name;
    if (manifest.locales &&
        manifest.locales[_lang] &&
        manifest.locales[_lang].name) {
      name = manifest.locales[_lang].name;
    }

    var vendor = '';
    if (manifest.developer && manifest.developer.name) {
      vendor = manifest.developer.name;
    }

    return {
      name: name,
      trust: trust,
      vendor: vendor,
      get iconURL()     { return _getBestIconURL(app); },
      get permissions() { return _getPermissions(app); },
      manifest: manifest,
      origin: app.origin
    };
  }


  /****************************************************************************
   * Permissions - private helpers
   */

  var _showAllPermissions = false;
  var _permTable = { // will be fetched from /resources/permissions_table.json
    plainPermissions: [],
    composedPermissions: [],
    accessModes: []
  };

  /**
   * Get a localized name & description for the given permission key.
   */
  function _localizePermission(permKey) {
    var l10nKey = 'perm-' + permKey.replace(':', '-');
    return {
      key: permKey,
      name: _(l10nKey) || permKey,
      desc: _(l10nKey + '-description') || ''
    };
  }

  /**
   * Get an array of app permissions.
   *
   * Rather than using the declared permission list in the manifest,
   * check that each permission is valid and really used by the app.
   *
   * Each permission is an object with the following properties:
   *  .key:        permission key.
   *  .value:      permission value ('deny', 'ask', 'grant').
   *  .access:     access mode ('readonly', 'readwrite', etc.).
   *  .name:       localized name (human-readable key).
   *  .desc:       localized description.
   *  .explicit:   true if the permission value can be changed by the user;
   *               false otherwise (i.e. internal/certified app).
   */
  function _getPermissions(app) {
    var permissions = [];

    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms) {
      console.error('navigator.mozPermissionSettings is undefined');
      return permissions;
    }

    function pushIfValid(permKey, accessMode) {
      var key = accessMode ? permKey + '-' + accessMode : permKey;
      var value = mozPerms.get(key, app.manifestURL, app.origin, false);
      if (value && value !== 'unknown') {
        var perm = _localizePermission(permKey);
        perm.value = value;
        perm.explicit =
          mozPerms.isExplicit(key, app.manifestURL, app.origin, false);
        permissions.push(perm);
        return true; // valid
      }
      return false; // not valid
    }

    if (_showAllPermissions) { // check all permissions listed in the manifest
      var manifest = app.manifest || app.updateManifest;
      if (manifest && manifest.permissions) {
        for (var perm in manifest.permissions) {
          var access = manifest.permissions[perm].access;
          if (access) {
            pushIfValid(perm, 'read'); // XXX
          } else {
            pushIfValid(perm);
          }
        }
      }
    } else { // only check permissions listed in _permTable
      // Note: this is the behavior of the Settings/Apps panel
      _permTable.plainPermissions.forEach(key => pushIfValid(key));
      _permTable.composedPermissions.forEach(key =>
        _permTable.accessModes.some(mode => pushIfValid(key, mode)));
    }

    return permissions.sort(_orderBy.name);
  }


  /****************************************************************************
   * Public API
   */

  /**
   * AppList
   *
   * @constructor
   */
  function AppList() {}

  AppList.prototype = {

    /**
     * Initialize the AppList.
     *
     * @method init
     * @param {Object}   permissionTable [optional]
     * @return {Promise}
     */
    init: function init(permissionTable) {
      if (permissionTable) {
        _permTable = permissionTable;
      }
      return new Promise(function(resolve, reject) {
        if (_applications.length) { // already initialized
          resolve();
        } else {
          _getApplications(resolve, reject);
          window.addEventListener('applicationinstall', _getApplications);
          window.addEventListener('applicationuninstall', _getApplications);
        }
      });
    },

    /**
     * List of supported permissions.
     *
     * @property permissions
     * @return {Array}  Array of supported permissions
     */
    get permissions() {
      return _permTable.plainPermissions
        .concat(_permTable.composedPermissions)
        .map(_localizePermission)
        .sort(_orderBy.name);
    },

    /**
     * List of installed applications.
     *
     * @property applications
     * @return {Array}  Array of extended {DOMApplication} objects
     */
    get applications() {
      return _applications;
    },

    /**
     * List of installed applications using a specific permission.
     *
     * @method getFilteredApps
     * @param {String} filter  Permission to match
     * @return {Array}
     */
    getFilteredApps: function getFilteredApps(filter) {
      return _applications.filter(app => app.manifest.permissions &&
          filter in app.manifest.permissions);
    },

    /**
     * List of installed applications grouped by name, trust level or vendor.
     *
     * @method getSortedApps
     * @param {String} sortKey  Either 'name', 'trust' or 'vendor'
     * @return {Object}
     */
    getSortedApps: function getSortedApps(sortKey) {
      var sorted = {};
      if (!(sortKey in _orderBy)) {
        throw 'unsupported application sort key: "' + sortKey + '"';
      }

      _applications.forEach(app => {
        var header = app[sortKey];
        if (!(header in sorted)) {
          sorted[header] = [];
        }
        sorted[header].push(app);
      });

      for (var header in sorted) {
        sorted[header].sort(_orderBy.name);
      }

      return sorted;
    }

  };

  return new AppList();
});
