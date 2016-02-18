/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
/* global Applications, applications*/
/** Application module handles the information of apps on behalf of other
 *  modules
 *  @class Applications
 */
(function(exports) {
  function Applications() {
  }

  Applications.prototype = {
    /**
     * The installed APPs list
     * @access public
     * @type {Object}
     * @memberof Applications.prototype
     */
    installedApps: {},

    /**
     * The statuts about get all installed Apps by mozApps API.
     * @access public
     * @type {boolean}
     * @memberof Applications.prototype
     */
    ready: true,

    /**
     * Stop the Applications services,
     * un-register apps.mgmt.oninstall and apps.mgmt.uninstall handler.
     * @memberof Applications.prototype
     */
    stop: function a_stop() {
      this.ready = false;
      this.installedApps = {};
    },

    /**
     * Start the Applications to get all installed Apps and
     * register apps.mgmt.oninstall and apps.mgmt.uninstall handler.
     * @memberof Applications.prototype
     */
    start: function a_start() {
      // Nothing to do anymore!
    },

    /**
     * Get App by ManifestURL.
     * @memberof Applications.prototype
     */
    getByManifestURL: function a_getByManifestURL(manifestURL) {
      if (manifestURL in this.installedApps) {
        return this.installedApps[manifestURL];
      }

      return null;
    },

    /**
     * Broadcast ApplicationReadyEvent when mozApps.mgmt.getAll() done.
     * @memberof Applications.prototype
     */

    fireApplicationReadyEvent: function a_fireAppReadyEvent() {
      var evt = new CustomEvent('applicationready',
                           { bubbles: true,
                             cancelable: false,
                             detail: { applications: this.installedApps } });
      window.dispatchEvent(evt);
    },

    /**
     * Broadcast ApplicationInstallEvent when apps.mgmt.oninstall occured.
     * We need to dispatch the following events because
     * mozApps is not doing so right now.
     * ref: @link https://bugzilla.mozilla.org/show_bug.cgi?id=731746
     * @memberof Applications.prototype
     */

    fireApplicationInstallEvent: function a_fireApplicationInstallEvent(app) {
      var evt = new CustomEvent('applicationinstall',
                               { bubbles: true,
                                 cancelable: false,
                                 detail: { application: app } });
      window.dispatchEvent(evt);
    },

    /**
     * Broadcast ApplicationUninstallEvent when apps.mgmt.onuninstall occured.
     * @memberof Applications.prototype
     */

    fireApplicationUninstallEvent:
                                function a_fireApplicationUninstallEvent(app) {
      var evt = new CustomEvent('applicationuninstall',
                               { bubbles: true,
                                 cancelable: false,
                                 detail: { application: app } });
      window.dispatchEvent(evt);
    },

    /**
     * Broadcast ApplicationEnabledEvent when apps.mgmt.onenabledstatechange
     * occured when the application was enabled.
     * @memberof Applications.prototype
     */

    fireApplicationEnabledEvent:
                                function a_fireApplicationEnabledEvent(app) {
      var evt = new CustomEvent('applicationenabled',
                               { bubbles: true,
                                 cancelable: false,
                                 detail: { application: app } });
      window.dispatchEvent(evt);
    },

    /**
     * Broadcast ApplicationDisabledEvent when apps.mgmt.onenabledstatechange
     * occured when the application was enabled.
     * @memberof Applications.prototype
     */

    fireApplicationDisabledEvent:
                                function a_fireApplicationDisabledEvent(app) {
      var evt = new CustomEvent('applicationdisabled',
                               { bubbles: true,
                                 cancelable: false,
                                 detail: { application: app } });
      window.dispatchEvent(evt);
    }
  };

  exports.Applications = Applications;
}(window));

window.applications = new Applications();
applications.start();
