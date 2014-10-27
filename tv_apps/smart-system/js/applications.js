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
    ready: false,

    /**
     * Stop the Applications services,
     * un-register apps.mgmt.oninstall and apps.mgmt.uninstall handler.
     * @memberof Applications.prototype
     */
    stop: function a_stop() {
      this.ready = false;
      this.installedApps = {};
      navigator.mozApps.mgmt.getAll().onsuccess = null;
      navigator.mozApps.mgmt.oninstall = null;
      navigator.mozApps.mgmt.onuninstall = null;
    },

    /**
     * Start the Applications to get all installed Apps and
     * register apps.mgmt.oninstall and apps.mgmt.uninstall handler.
     * @memberof Applications.prototype
     */
    start: function a_start() {
      var self = this;
      var apps = navigator.mozApps;

      var getAllApps = function getAllApps() {
        navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
          var apps = evt.target.result;
          apps.forEach(function(app) {
            self.installedApps[app.manifestURL] = app;
            // TODO Followup for retrieving homescreen & comms app
          });

          self.ready = true;
          self.fireApplicationReadyEvent();
        };
      };

      // We need to wait for the chrome shell to let us know when it's ok to
      // launch activities. This prevents race conditions.
      // The event does not fire again when we reload System app in on
      // B2G Desktop, so we save the information into sessionStorage.
      if (window.sessionStorage.getItem('webapps-registry-ready')) {
        getAllApps();
      } else {
        window.addEventListener('mozChromeEvent', function mozAppReady(event) {
          if (event.detail.type != 'webapps-registry-ready') {
            return;
          }

          window.sessionStorage.setItem('webapps-registry-ready', 'yes');
          window.removeEventListener('mozChromeEvent', mozAppReady);

          getAllApps();
        });
      }

      apps.mgmt.oninstall = function a_install(evt) {
        var newapp = evt.application;
        self.installedApps[newapp.manifestURL] = newapp;

        self.fireApplicationInstallEvent(newapp);
      };

      apps.mgmt.onuninstall = function a_uninstall(evt) {
        var deletedapp = evt.application;
        delete self.installedApps[deletedapp.manifestURL];

        self.fireApplicationUninstallEvent(deletedapp);
      };
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
    }
  };

  exports.Applications = Applications;
}(window));

window.applications = new Applications();
applications.start();
