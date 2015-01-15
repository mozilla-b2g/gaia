/* global BaseModule, LazyLoader, RoamingWarningSystemDialog */
'use strict';

(function() {
  // Responsible to load and init the sub system for mobile connections.
  var DataConnectionManager = function(core) {
    this.core = core;
    this.mobileConnections = core.mobileConnections;
  };

  DataConnectionManager.SETTINGS = [
    'ril.data.roaming_enabled',
    'ril.data.roaming_enabled.warningDialog.enabled'
  ];

  DataConnectionManager.SERVICES = [
    'enableDataConnection'
  ];

  BaseModule.create(DataConnectionManager, {
    name: 'DataConnectionManager',
    DEBUG: false,

    checkRoaming: function(conn) {
      var roaming = this._settings['ril.data.roaming_enabled'];
      return this.DEBUG || (!roaming && conn.data.roaming);
    },

    enableDataConnection: function() {
      var dataType, conn;
      for (var i = 0; i < this.mobileConnections.length && !dataType; i++) {
        dataType = this.mobileConnections[i].data.type;
        conn = this.mobileConnections[i];
      }
      if (!dataType) {
        // No connection available
        this.debug('No connection available', dataType);
        return;
      }

      if (this.checkRoaming(conn)) {
        this.disabledDefaultDialogIfNeeded();
      } else {
        // XXX: Tell Radio module to do this.
        this.writeSetting({'ril.data.enabled': true});
      }
    },

    enableDialog: function(enabled) {
      if (enabled) {
        if (!this.dialog) {
          LazyLoader.load(['js/roaming_warning_system_dialog.js'])
            .then(function() {
              this.dialog = new RoamingWarningSystemDialog(this);
              this.service.request('UtilityTray:hide');
              this.dialog.show();
            }.bind(this));
        } else {
          this.service.request('UtilityTray:hide');
          this.dialog.show();
        }
      } else {
        this.dialog && this.dialog.hide();
      }
    },

    // Hides the warning dialog to prevent to show it in settings app again
    disabledDefaultDialogIfNeeded: function() {
      var warning =
        this._settings['ril.data.roaming_enabled.warningDialog.enabled'];
      if (warning || warning === null) {
        this.writeSetting({
          'ril.data.roaming_enabled.warningDialog.enabled': false
        });
      }
      this.enableDialog(true);
    }
  });
}());
