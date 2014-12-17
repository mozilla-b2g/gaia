/* globals SIMSlotManager, Notification, MozActivity, Promise,
           LazyLoader, BaseModule */
'use strict';

(function() {
  var EU_ROAMING_FILE_PATH = '/resources/eu-roaming.json';

  /**
   * EuRoamingManager observes the mobile codes of the current connected
   * operator and display a notification when necessary.
   *
   * @class EuRoamingManager
   */
  function EuRoamingManager(core) {
    this._connections = Array.slice(core.mobileConnections || []);

    this._simMobileCodes = [];
    this._curNetworkMobileCodes = [];

    this._homeOperatorList = null;
    this._foreignOperatorList = null;
  }

  BaseModule.create(EuRoamingManager, {
    name: 'EuRoamingManager',
    TAG_PREFIX: 'euRoamingNotificaton',
    EU_ROAMING_ENABLED_KEY: 'eu-roaming.enabled',
    EU_ROAMING_NOTIFICATION_STATE_KEY: 'eu-roaming.notification.state',
    NOTIFICATION_STATES: {
      UNAVAILABLE: 'unavailable',
      DISPLAYED: 'displayed',
      OPENED: 'opened'
    },

    /**
     * Starts the module.
     *
     * @memberof EuRoamingManager.prototype
     */
    _start: function() {
      // Clear existing notifications.
      this._clearNotifications();
      this._init();
    },

    /**
     * Load the EU roaming file and register related listeners when necessary.
     *
     * @memberof EuRoamingManager.prototype
     * @returns {Promise}
     */
    _init: function() {
      var that = this;

      return this._loadJSON(EU_ROAMING_FILE_PATH)
      .then(function(result) {
        if (!result) {
          return;
        }

        that._homeOperatorList = result.home;
        that._foreignOperatorList = result.foreign;

        if (that._homeOperatorList &&
            that._foreignOperatorList &&
            Object.keys(that._homeOperatorList).length > 0 &&
            Object.keys(that._foreignOperatorList).length > 0) {
          that._initValues();
          that._addSimChangeListener();
          that._addDataChangeListener();

          // Check the current state ar first.
          that._connections.forEach(
            that._tryShowEuRoamingNotification.bind(that));
        }
      });
    },

    /**
     * Initialzes values.
     *
     * @memberof EuRoamingManager.prototype
     */
    _initValues: function() {
      // Initialize the default values.
      SIMSlotManager.getSlots().forEach(function(simSlot, index) {
        this._curNetworkMobileCodes.push(null);

        var iccInfo = simSlot && simSlot.simCard && simSlot.simCard.iccInfo;
        if (iccInfo) {
          this._simMobileCodes.push({ mcc: iccInfo.mcc, mnc: iccInfo.mnc });
        } else {
          this._simMobileCodes.push(null);
        }
      }, this);
    },

    /**
     * Check if the mobile codes is a valid EU romaing home operator.
     *
     * @memberof EuRoamingManager.prototype
     * @param {String} mcc
     * @param {String} mnc
     * @returns {Boolean}
     */
    _isEURoamingHomeOperator: function(mcc, mnc) {
      if (!this._homeOperatorList || !mcc || !mnc) {
        return false;
      }
      return !!this._homeOperatorList[mcc][mnc];
    },

    /**
     * Check if the mobile codes is a valid EU romaing foreign operator.
     *
     * @memberof EuRoamingManager.prototype
     * @param {String} mcc
     * @param {String} mnc
     * @returns {Boolean}
     */
    _isEURoamingForeignOperator: function(mcc, mnc) {
      if (!this._foreignOperatorList || !mcc || !mnc) {
        return false;
      }
      return !!this._foreignOperatorList[mcc][mnc];
    },

    /**
     * Add listeners on events related to the change of the mobile codes stored
     * on the icc card.
     *
     * @memberof EuRoamingManager.prototype
     */
    _addSimChangeListener: function() {
      ['updated', 'iccinfochange', 'cardstatechange'].forEach(
        function(eventName) {
          window.addEventListener('simslot-' + eventName,
            this._onSimChanged.bind(this));
      }, this);
    },

    /**
     * Add listeners on events related to the change of the mobile codes of the
     * currently connected data network.
     *
     * @memberof EuRoamingManager.prototype
     */
    _addDataChangeListener: function() {
      this._connections.forEach(function(connection, index) {
        connection.addEventListener('datachange', function() {
          this._tryShowEuRoamingNotification(connection, index);
        }.bind(this));
      }, this);
    },

    /**
     * The function stores the mobile codes of the currently used sim card and
     * try to display the notification.
     *
     * @memberof EuRoamingManager.prototype
     */
    _onSimChanged: function(event) {
      var simSlot = event.detail;
      var iccInfo = simSlot && simSlot.simCard && simSlot.simCard.iccInfo;

      if (!iccInfo) {
        return;
      }

      this._simMobileCodes[simSlot.index] =
        { mcc: iccInfo.mcc, mnc: iccInfo.mnc };
      this._tryShowEuRoamingNotification(simSlot.conn, simSlot.index);
    },

    /**
     * The function displays the EU roaming notification when:
     *   - Roaming on the newly connected data network.
     *   - The mobile codes of the operators of the sim card are listed in the
     *     "home" section of the EU roaming file.
     *   - The mobile codes of the operators of the connected data network are
     *     listed in the "foreign" section of the EU roaming file.
     *
     * @memberof EuRoamingManager.prototype
     * @param {MobileConnection} connection
     * @param {Number} index
     * @returns {Promise}
     */
    _tryShowEuRoamingNotification: function(connection, index) {
      var data = connection.data;
      var network = data && data.network;
      if (!network) {
        return;
      }

      var simMobileCode = this._simMobileCodes[index];
      var simMcc = simMobileCode && simMobileCode.mcc;
      var simMnc = simMobileCode && simMobileCode.mnc;

      var curNetworkMobileCode = this._curNetworkMobileCodes[index];
      var curNetworkMcc = curNetworkMobileCode && curNetworkMobileCode.mcc;
      var curNetworkMnc = curNetworkMobileCode && curNetworkMobileCode.mnc;

      if (network.mcc !== curNetworkMcc || network.mnc !== curNetworkMnc) {
        // a new operator detected.
        this._curNetworkMobileCodes[index] =
          { mcc: network.mcc, mnc: network.mnc };

        if (data.roaming &&
            // check if the operator of the sim is in the EU regulation list.
            this._isEURoamingHomeOperator(simMcc, simMnc) &&
            // check if the new operator is a supported foreign operator or not.
            this._isEURoamingForeignOperator(network.mcc, network.mnc)) {
          return this._getState(this.EU_ROAMING_NOTIFICATION_STATE_KEY + index)
          .then(function(notificationState) {
            this._setState(this.EU_ROAMING_ENABLED_KEY + index, true);
            // display the notification if it has never been opened before.
            if (notificationState !== this.NOTIFICATION_STATES.OPENED) {
              this._showNotification(index);
              return this._setState(
                this.EU_ROAMING_NOTIFICATION_STATE_KEY + index,
                this.NOTIFICATION_STATES.DISPLAYED);
            }
          }.bind(this)).catch(function(err) {
            console.error(err);
          });
        } else {
          return Promise.all([
            this._setState(this.EU_ROAMING_ENABLED_KEY + index, false),
            this._setState(this.EU_ROAMING_NOTIFICATION_STATE_KEY + index,
            this.NOTIFICATION_STATES.UNAVAILABLE)
          ]).catch(function(err) {
            console.error(err);
          });
        }
      }
    },

    /**
     * Clear all notifications of EU roaming.
     *
     * @memberof EuRoamingManager.prototype
     * @returns {Promise}
     */
    _clearNotifications: function() {
      var that = this;
      return Notification.get().then(function(notifications) {
        notifications.forEach(function(notification) {
          var tag = notification && notification.tag;
          if (!tag || !tag.startsWith(that.TAG_PREFIX)) {
            return;
          }
          notification.close();
        });
      });
    },

    /**
     * Shows the EU roaming notification of a sim card.
     *
     * @memberof EuRoamingManager.prototype
     * @param {Number} serviceId
     */
    _showNotification: function(serviceId) {
      var _ = navigator.mozL10n.get;
      var iconUrl =  window.location.origin + '/style/eu_roaming_manager/' +
        'eu_roaming.png';
      var options = {
        body: _('euRoamingNotificationMsg'),
        icon: iconUrl,
        tag: this.TAG_PREFIX + serviceId,
        mozbehavior: {
          showOnlyOnce: true
        }
      };
      var notification =
        new Notification(_('euRoamingNotificationTitle'), options);

      notification.onclick = function() {
        this._triggerSettingsActivity(serviceId);
        notification.close();
      }.bind(this);

      notification.onclose = function() {
        this._setState(this.EU_ROAMING_NOTIFICATION_STATE_KEY + serviceId,
          this.NOTIFICATION_STATES.OPENED);
      }.bind(this);
    },

    /**
     * Invokes an activity for setting the EU roaming apn.
     *
     * @memberof EuRoamingManager.prototype
     * @param {Number} serviceId
     */
    _triggerSettingsActivity: function(serviceId) {
      var activity = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'apn-list',
          options: {
            role: 'activity',
            type: 'default',
            serviceId: serviceId
          }
        }
      });
      activity.onsuccess = function() {};
    },

    _getState: function(key) {
      return new Promise(function(resolve, reject) {
        var req = navigator.mozSettings.createLock().get(key);
        req.onsuccess = function() {
          resolve(req.result[key]);
        };
        req.onerror = function() {
          reject('get state ' + key + ' error');
        };
      });
    },

    _setState: function(key, state) {
      return new Promise(function(resolve, reject) {
        var obj = {};
        obj[key] = state;
        var req = navigator.mozSettings.createLock().set(obj);
        req.onsuccess = resolve;
        req.onerror = function() {
          reject('set state ' + key + ' error');
        };
      });
    },

    _loadJSON: function(path) {
      return LazyLoader.getJSON(path).then(function(json) {
        return Promise.resolve(json);
      }, function(error) {
        return Promise.resolve(null);
      });
    }
  });
}());
