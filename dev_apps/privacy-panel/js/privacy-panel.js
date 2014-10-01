/* global Crypto */
/* global Commands */

'use strict';

var RING_ENABLED = 'rpp.ring.enabled';
var LOCK_ENABLED = 'rpp.lock.enabled';
var LOCATE_ENABLED = 'rpp.locate.enabled';
var WIPE_ENABLED = 'rpp.wipe.enabled';
var PASSWORD = 'rpp.password';
var RESET_REQUIRED = 'rpp.reset.required';
var PASSCODE_ENABLED = 'lockscreen.passcode-lock.enabled';

var PrivacyPanel = {

  _ringEnabled: false,
  _lockEnabled: false,
  _locateEnabled: false,
  _wipeEnabled: false,
  _password : null,
  _resetRequired : false,
  _passcodeEnabled : false,
  _deviceId : null,

  init: function() {
    this._getSettings();
    this._observeSettings();
    this._addListener();
  },

  _getSettings: function() {
    var self = this;

    var apps = navigator.mozApps;
    if (apps) {
      var reqPerm = apps.getSelf();
      if (reqPerm) {
        reqPerm.onsuccess = function() {
          var app = reqPerm.result;
          if (app) {
            var permission = navigator.mozPermissionSettings;
            if (permission) {
              permission.set(
                'geolocation', 'allow', app.manifestURL, app.origin, false
              );
            }
          }
        };

        reqPerm.onerror = function() {};
      }
    }

    var mobileConnections = navigator.mozMobileConnections;
    if (mobileConnections && mobileConnections.length > 0) {
      var mobileConnection = mobileConnections[0];
      if (mobileConnection) {
        var reqIMEI = mobileConnection.sendMMI('*#06#');
        if (reqIMEI) {
          reqIMEI.onsuccess = function() {
            self._deviceId = reqIMEI.result.statusMessage;
          };

          reqIMEI.onerror = function() {};
        }
      }
    }

    var settings = navigator.mozSettings;
    if (!settings) {
      return;
    }

    var lock = settings.createLock();
    if (!lock) {
      return;
    }

    var reqRing = lock.get(RING_ENABLED);
    if (reqRing) {
      reqRing.onsuccess = function() {
        var value = reqRing.result[RING_ENABLED];
        if (typeof value === 'boolean') {
          self._ringEnabled = value;
        } else if (typeof value === 'string') {
          self._ringEnabled = (value === 'true');
        }
      };

      reqRing.onerror = function() {};
    }

    var reqLock = lock.get(LOCK_ENABLED);
    if (reqLock) {
      reqLock.onsuccess = function() {
        var value = reqLock.result[LOCK_ENABLED];
        if (typeof value === 'boolean') {
          self._lockEnabled = value;
        } else if (typeof value === 'string') {
          self._lockEnabled = (value === 'true');
        }
      };

      reqLock.onerror = function() {};
    }

    var reqLocate = lock.get(LOCATE_ENABLED);
    if (reqLocate) {
      reqLocate.onsuccess = function() {
        var value = reqLocate.result[LOCATE_ENABLED];
        if (typeof value === 'boolean') {
          self._locateEnabled = value;
        } else if (typeof value === 'string') {
          self._locateEnabled = (value === 'true');
        }
      };

      reqLocate.onerror = function() {};
    }

    var reqWipe = lock.get(WIPE_ENABLED);
    if (reqWipe) {
      reqWipe.onsuccess = function() {
        var value = reqWipe.result[WIPE_ENABLED];
        if (typeof value === 'boolean') {
          self._wipeEnabled = value;
        } else if (typeof value === 'string') {
          self._wipeEnabled = (value === 'true');
        }
      };

      reqWipe.onerror = function() {};
    }

    var passreq = lock.get(PASSWORD);
    if (passreq) {
      passreq.onsuccess = function() {
        self._password = passreq.result[PASSWORD];
      };

      passreq.onerror = function() {};
    }
    var resetReq = lock.get(RESET_REQUIRED);
    if (resetReq) {
      resetReq.onsuccess = function() {
        var value = resetReq.result[RESET_REQUIRED];
        if (typeof value === 'boolean') {
          self._resetRequired = value;
        } else if (typeof value === 'string') {
          self._resetRequired = (value === 'true');
        }
      };

      resetReq.onerror = function() {
        console.warn('Error while reading setting ', resetReq.error);
      };
    }


    var passcodeReq = lock.get(PASSCODE_ENABLED);
    if (passcodeReq) {
      passcodeReq.onsuccess = function() {
        var value = passcodeReq.result[PASSCODE_ENABLED];
        if (typeof value === 'boolean') {
          self._passcodeEnabled = value;
        } else if (typeof value === 'string') {
          self._passcodeEnabled = (value === 'true');
        }
      };

      passcodeReq.onerror = function() {};
    }
  },

  _observeSettings: function() {
    var settings = navigator.mozSettings;
    if (settings) {
      settings.addObserver(RING_ENABLED, this._onSettingsChanged.bind(this));
      settings.addObserver(LOCK_ENABLED, this._onSettingsChanged.bind(this));
      settings.addObserver(LOCATE_ENABLED, this._onSettingsChanged.bind(this));
      settings.addObserver(WIPE_ENABLED, this._onSettingsChanged.bind(this));
      settings.addObserver(PASSWORD, this._onSettingsChanged.bind(this));
      settings.addObserver(RESET_REQUIRED, this._onSettingsChanged.bind(this));
      settings.addObserver(PASSCODE_ENABLED,
        this._onSettingsChanged.bind(this));
    }
  },

  _onSettingsChanged: function(event) {
    var name = event.settingName;
    var value = event.settingValue;

    if (name === RING_ENABLED) {
      if (typeof value === 'boolean') {
        this._ringEnabled = value;
      } else if (typeof value === 'string') {
        this._ringEnabled = (value === 'true');
      }

    } else if (name === LOCK_ENABLED) {
      if (typeof value === 'boolean') {
        this._lockEnabled = value;
      } else if (typeof value === 'string') {
        this._lockEnabled = (value === 'true');
      }

    } else if (name === LOCATE_ENABLED) {
      if (typeof value === 'boolean') {
        this._locateEnabled = value;
      } else if (typeof value === 'string') {
        this._locateEnabled = (value === 'true');
      }

    } else if (name === WIPE_ENABLED) {
      if (typeof value === 'boolean') {
        this._wipeEnabled = value;
      } else if (typeof value === 'string') {
        this._wipeEnabled = (value === 'true');
      }

    } else if (name === PASSWORD) {
      this._password = value;
    } else if (name === RESET_REQUIRED) {
      if (typeof value === 'boolean') {
        this._resetRequired = value;
      } else if (typeof value === 'string') {
        this._resetRequired = (value === 'true');
      }
    } else if (name === PASSCODE_ENABLED) {
      if (typeof value === 'boolean') {
        this._passcodeEnabled = value;
      } else if (typeof value === 'string') {
        this._passcodeEnabled = (value === 'true');
      }
    }
  },

  _setResetRequired : function() {
    var settings = navigator.mozSettings;
    if (settings) {
      var lock = settings.createLock();
      if (lock) {
        var param = {};
        param[RESET_REQUIRED] = true;
        lock.set(param);
      }
    }
  },

  _addListener: function() {
    var mobileMessage = navigator.mozMobileMessage;
    if (mobileMessage) {
      mobileMessage.getThreads();
      mobileMessage
        .addEventListener('received', this._onSMSReceived.bind(this));
    }
  },

  _validatePassKey: function(pass) {
    return Crypto.MD5(pass).toString() === this._password;
  },


  /**
   * Search for RPP commands and execute them.
   *
   * @param {Object} event Object recieved from SMS listener event 'recieved'
   */
  _onSMSReceived: function(event) {
    var match, cmd, passkey, body = event.message.body,
        rgx = /rpp\s(lock|ring|locate|wipe)\s([a-z0-9]{1,100})/i;

    match = body.match(rgx);

    if (match) {
      cmd = match[1];
      passkey = match[2];

      if ( ! this._validatePassKey(passkey)) {
        this._sendSMS(event.message.sender, 'RPP: Wrong password');
        return;
      }

      switch(cmd.toLowerCase()) {
        case 'lock':
          this._lock(event.message.sender);
          break;
        case 'ring':
          this._ring(event.message.sender);
          break;
        case 'locate':
          this._locate(event.message.sender);
          break;
        default:
          break;
      }
    }
  },

  _sendSMS : function(number, message) {
    if (navigator.mozMobileMessage) {
      navigator.mozMobileMessage.send(number, message);
    }
  },

  _ring : function(number) {
    if ( ! this._ringEnabled) {
      this._sendSMS(number,
        'RPP: Ring setting is turned off'
      );
      return;
    }

    var ringReply = function(res, err) {
      if ( ! res) {
        console.warn('Error while trying to ring a phone, ' + err);
        return;
      }

      this._sendSMS(number, 'RPP: Your device should ring now');

      // Lock phone
      setTimeout(function() {
        this._doLock(number);
      }.bind(this), 3000);

      // Set reset flag
      this._setResetRequired();
    }.bind(this);

    Commands.invokeCommand('ring', [86400, ringReply]);
  },

  /**
   * Remotely locks the screen
   * 
   * @param  {Number} number Phone number
   */
  _lock : function(number) {
    if ( ! this._lockEnabled) {
      this._sendSMS(number, 'RPP: Lock setting is turned off');
      return;
    }

    // Lock screen
    this._doLock(number);
  },

  _locate : function(number) {
    if ( ! this._locateEnabled) {
      this._sendSMS(number, 'RPP: Locate setting is turned off');
      return;
    }

    var locateReply = function(res, pos) {
      var lat, lon;

      if ( ! res) {
        console.warn('Error while trying to locate a phone, ' + pos);
        return;
      }

      lat = pos.coords.latitude;
      lon = pos.coords.longitude;

      this._sendSMS(number, 'RPP: Your device is here: @' + lat + ',' + lon);

      // Lock phone
      setTimeout(function() {
        this._doLock(number);
      }.bind(this), 3000);

      // Set reset flag
      this._setResetRequired();
    }.bind(this);

    Commands.invokeCommand('track', [6, locateReply]);
  },

  /**
   * Perform lockscreen
   * 
   * @param  {Number} number Phone number
   */
  _doLock : function(number) {
    var self = this;
    var lockReply = function(res, err) {
      var msg;

      if ( ! res) {
        //FmD: <deviceId> not locked remotely, time: <time>
        msg = 'RPP: Your device was not locked remotely, time: ' +
          self._getTime();
      } else {
        //FmD: <deviceId> locked remotely at time: <time>[, code: <passcode>]
        msg = 'RPP: Your device was locked. Time: ' + self._getTime() + '.';
        if (passcode) {
          msg = msg + 'To unlock it use code: ' + passcode;
        }
      }

      self._sendSMS(number, msg);

      if (res) {
        //set reset flag
        self._setResetRequired();
      }
    };
    var passcode = null;
    if (!this._passcodeEnabled) {
      var d1 = Math.floor(Math.random() * 10);
      var d2 = Math.floor(Math.random() * 10);
      var d3 = Math.floor(Math.random() * 10);
      var d4 = Math.floor(Math.random() * 10);
      passcode = '' + d1 + d2 + d3 + d4;
    }
    Commands.invokeCommand('lock', [null, passcode, lockReply]);
  },

  // _wipe : function(number) {
  //   if ( ! this._lockEnabled) {
  //     this._sendSMS(number,
  //       'rpp ' + this._deviceId + ' lock setting is turned off'
  //     );
  //     return;
  //   }

  //   if (this._resetRequired) {
  //     this._sendSMS(number,
  //       'rpp ' + this._deviceId + ' password requires reset'
  //     );
  //     return;
  //   }

  //   var wipeReply = function(res) {};
  //   Commands.invokeCommand('erase', [wipeReply]);
  // },

  _getTime : function() {
    var now = new Date();

    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();
    if (h < 10) {
      h = '0' + h;
    }
    if (m < 10) {
      m = '0' + m;
    }
    if (s < 10) {
      s = '0' + s;
    }

    var tz = '';
    var str = now.toString().split('(');
    if (str.length === 2) {
      var n = str[1].replace(')', '');
      var parts = n.split(' ');
      var abbr = '';
      if (parts.length > 1) {
        for (var i = 0; i < parts.length; i++) {
          abbr += parts[i].charAt(0).toUpperCase();
        }
      } else {
        abbr = parts[0];
      }
      tz = abbr;
    }

    var off = now.getTimezoneOffset() / 60;

    return h + ':' + m + ':' + s + ' ' + tz + ' (UTC' + off + ')';
  }
};

navigator.mozL10n.once(PrivacyPanel.init.bind(PrivacyPanel));
