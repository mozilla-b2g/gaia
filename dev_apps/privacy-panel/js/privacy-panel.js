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
var PREFIX_CMD = 'FmD:';
var RING_CMD = 'SoundAlarm';
var LOCK_CMD = 'LockDevice';
var LOCATE_CMD = 'LocateDevice';
var WIPE_CMD = 'WipeDevice';

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
    console.log('!!!!!!!!!!!!!! [privacy-panel] init !!!!!!!!!!!!!!');

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
              console.log('!!!!!!!!!!!!!! [privacy-panel] set geolocation ' + 
                          'permission !!!!!!!!!!!!!!');
              permission.set('geolocation', 'allow', app.manifestURL, app.origin, false);
            }
          }
        };

        reqPerm.onerror = function() {
          console.log('!!!!!!!!!!!!!! [privacy-panel] ' + reqPerm.error.name + 
                      ' !!!!!!!!!!!!!!');
        };
      }
    }

    var mobileConnections = navigator.mozMobileConnections;
    if (mobileConnections && mobileConnections.length > 0) {
      var mobileConnection = mobileConnections[0];
      if (mobileConnection) {
        var reqIMEI = mobileConnection.sendMMI('*#06#');
        if (reqIMEI) {
          reqIMEI.onsuccess = function () {
            self._deviceId = reqIMEI.result['statusMessage'];
            console.log('!!!!!!!!!!!!!! [privacy-panel] deviceId = ' + self._deviceId + ' !!!!!!!!!!!!!!');
          };

          reqIMEI.onerror = function () {
            console.log('!!!!!!!!!!!!!! [privacy-panel] ' + reqIMEI.error + ' !!!!!!!!!!!!!!');
          };
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
        if (typeof value == 'boolean') {
          self._ringEnabled = value;
        } else if (typeof value == 'string') {
          self._ringEnabled = (value == 'true');
        }
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' +
                    RING_ENABLED + ' = ' + self._ringEnabled +
                    ' !!!!!!!!!!!!!!');
      };

      reqRing.onerror = function() {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ' + reqRing.error +
                    ' !!!!!!!!!!!!!!');
      };
    }

    var reqLock = lock.get(LOCK_ENABLED);
    if (reqLock) {
      reqLock.onsuccess = function() {
        var value = reqLock.result[LOCK_ENABLED];
        if (typeof value == 'boolean') {
          self._lockEnabled = value;
        } else if (typeof value == 'string') {
          self._lockEnabled = (value == 'true');
        }
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' +
                    LOCK_ENABLED + ' = ' + self._lockEnabled +
                    ' !!!!!!!!!!!!!!');
      };

      reqLock.onerror = function() {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ' + reqLock.error +
                    ' !!!!!!!!!!!!!!');
      };
    }

    var reqLocate = lock.get(LOCATE_ENABLED);
    if (reqLocate) {
      reqLocate.onsuccess = function() {
        var value = reqLocate.result[LOCATE_ENABLED];
        if (typeof value == 'boolean') {
          self._locateEnabled = value;
        } else if (typeof value == 'string') {
          self._locateEnabled = (value == 'true');
        }
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' +
                    LOCATE_ENABLED + ' = ' + self._locateEnabled +
                    ' !!!!!!!!!!!!!!');
      };

      reqLocate.onerror = function() {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ' + reqLocate.error +
                    ' !!!!!!!!!!!!!!');
      };
    }

    var reqWipe = lock.get(WIPE_ENABLED);
    if (reqWipe) {
      reqWipe.onsuccess = function() {
        var value = reqWipe.result[WIPE_ENABLED];
        if (typeof value == 'boolean') {
          self._wipeEnabled = value;
        } else if (typeof value == 'string') {
          self._wipeEnabled = (value == 'true');
        }
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' +
                    WIPE_ENABLED + ' = ' + self._wipeEnabled +
                    ' !!!!!!!!!!!!!!');
      };

      reqWipe.onerror = function() {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ' + reqWipe.error +
                    ' !!!!!!!!!!!!!!');
      };
    }
    
    var passreq = lock.get(PASSWORD);
    if (passreq) {
      passreq.onsuccess = function() {
        self._password = passreq.result[PASSWORD];
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' + PASSWORD +
                    ' = ' + self._password + ' !!!!!!!!!!!!!!');
      };

      passreq.onerror = function() {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ' + passreq.error +
                    ' !!!!!!!!!!!!!!');
      };
    }
    var resetReq = lock.get(RESET_REQUIRED);
    if (resetReq) {
      resetReq.onsuccess = function () {
        var value = resetReq.result[RESET_REQUIRED];
        if (typeof value == 'boolean') {
          self._resetRequired = value;
        } else if (typeof value == 'string') {
          self._resetRequired = (value == 'true');
        }
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' + RESET_REQUIRED + ' = ' + self._resetRequired + ' !!!!!!!!!!!!!!');
     };

     resetReq.onerror = function () {
       console.log('!!!!!!!!!!!!!! [privacy-panel] ' + resetReq.error + ' !!!!!!!!!!!!!!');
     };
   }


    var passcodeReq = lock.get(PASSCODE_ENABLED);
    if (passcodeReq) {
      passcodeReq.onsuccess = function () {
        var value = passcodeReq.result[PASSCODE_ENABLED];
        if (typeof value == 'boolean') {
          self._passcodeEnabled = value;
        } else if (typeof value == 'string') {
          self._passcodeEnabled = (value == 'true');
        }
        console.log('!!!!!!!!!!!!!! [privacy-panel] init value: ' + 
                    PASSCODE_ENABLED + ' = ' + self._passcodeEnabled + 
                    ' !!!!!!!!!!!!!!');
      };

      passcodeReq.onerror = function () {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ' + passcodeReq.error + 
                    ' !!!!!!!!!!!!!!');
      };
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
      settings.addObserver(PASSCODE_ENABLED, this._onSettingsChanged.bind(this));
    }
  },

  _onSettingsChanged: function(event) {
    var name = event.settingName;
    var value = event.settingValue;

    if (name == RING_ENABLED) {
      if (typeof value == 'boolean') {
        this._ringEnabled = value;
      } else if (typeof value == 'string') {
        this._ringEnabled = (value == 'true');
      }
      console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + RING_ENABLED +
                  ' = ' + this._ringEnabled + ' !!!!!!!!!!!!!!');

    } else if (name == LOCK_ENABLED) {
      if (typeof value == 'boolean') {
        this._lockEnabled = value;
      } else if (typeof value == 'string') {
        this._lockEnabled = (value == 'true');
      }
      console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + LOCK_ENABLED +
                  ' = ' + this._lockEnabled + ' !!!!!!!!!!!!!!');

    } else if (name == LOCATE_ENABLED) {
      if (typeof value == 'boolean') {
        this._locateEnabled = value;
      } else if (typeof value == 'string') {
        this._locateEnabled = (value == 'true');
      }
      console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + LOCATE_ENABLED +
                  ' = ' + this._locateEnabled + ' !!!!!!!!!!!!!!');

    } else if (name == WIPE_ENABLED) {
      if (typeof value == 'boolean') {
        this._wipeEnabled = value;
      } else if (typeof value == 'string') {
        this._wipeEnabled = (value == 'true');
      }
      console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + WIPE_ENABLED +
                  ' = ' + this._wipeEnabled + ' !!!!!!!!!!!!!!');

    } else if (name == PASSWORD) {
      this._password = value;
      console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + PASSWORD +
              ' = ' + this._password + ' !!!!!!!!!!!!!!');
    } else if (name == RESET_REQUIRED) {
       if (typeof value == 'boolean') {
         this._resetRequired = value;
       } else if (typeof value == 'string') {
         this._resetRequired = (value == 'true');
       }
       console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + RESET_REQUIRED + ' = ' + this._resetRequired + ' !!!!!!!!!!!!!!');
    } else if (name == PASSCODE_ENABLED) {
      if (typeof value == 'boolean') {
        this._passcodeEnabled = value;
      } else if (typeof value == 'string') {
        this._passcodeEnabled = (value == 'true');
      }
      console.log('!!!!!!!!!!!!!! [privacy-panel] new value: ' + 
                  PASSCODE_ENABLED + ' = ' + this._passcodeEnabled + 
                  ' !!!!!!!!!!!!!!');
    }
  },

_setResetRequired : function () {
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
      mobileMessage.addEventListener('received', this._onSMSReceived.bind(this));
    }
  },

  _onSMSReceived: function(event) {
    console.log('!!!!!!!!!!!!!! [privacy-panel] sender = ' +
                event.message.sender + ' !!!!!!!!!!!!!!');
    console.log('!!!!!!!!!!!!!! [privacy-panel] message = ' +
                event.message.body + ' !!!!!!!!!!!!!!');

    if (this._ringEnabled || this._lockEnabled ||
        this._locateEnabled || this._wipeEnabled) {
      var sms = event.message;
      if (sms && sms.body) {
        var arr = sms.body.split(' ');
        if (arr && arr.length == 3) {
          if (arr[0] == PREFIX_CMD) {
            if (arr[1] == RING_CMD || arr[1] == LOCK_CMD ||
                arr[1] == LOCATE_CMD || arr[1] == WIPE_CMD) {
              if (Crypto.MD5(arr[2]) == this._password) {
                console.log('!!!!!!!!!!!!!! [privacy-panel] FmD SMS !!!!!!!!!!!!!!');
                if (arr[1] == RING_CMD && this._ringEnabled) {
                  console.log('!!!!!!!!!!!!!! [privacy-panel] invoke ring !!!!!!!!!!!!!!');
                  this._ring(sms.sender);
                } else if (arr[1] == LOCK_CMD && this._lockEnabled && !this._resetRequired) {
                  console.log('!!!!!!!!!!!!!! [privacy-panel] invoke lock !!!!!!!!!!!!!!');
                  this._lock(sms.sender);
                } else if (arr[1] == LOCATE_CMD && this._locateEnabled) {
                  console.log('!!!!!!!!!!!!!! [privacy-panel] invoke locate !!!!!!!!!!!!!!');
                  this._locate(sms.sender);
                } else if (arr[1] == WIPE_CMD && this._wipeEnabled && !this._resetRequired) {
                  console.log('!!!!!!!!!!!!!! [privacy-panel] invoke wipe !!!!!!!!!!!!!!');
                  this._wipe();
                }
              }
            }
          }
        }
      }
    } else {
      console.log('!!!!!!!!!!!!!! [privacy-panel] not enabled !!!!!!!!!!!!!!');
    }
  },

  _ring : function (number) {
    var self = this;
    var ringReply = function (res, err) {
      if (!res) {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ring err = ' + err + ' !!!!!!!!!!!!!!');
      } else {
        console.log('!!!!!!!!!!!!!! [privacy-panel] ring OK !!!!!!!!!!!!!!');

        //lock phone (only once)
        if (!self._resetRequired) {
          setTimeout(function () {
            self._lock(number)
          }, 3000);
        }

        //set reset flag
        self._setResetRequired();
      }
    };
    Commands.invokeCommand('ring', [30, ringReply]);
  },

  _lock : function (number) {
    var self = this;
    var lockReply = function (res, err) {
      var msg;

      if (!res) {
        console.log('!!!!!!!!!!!!!! [privacy-panel] lock err = ' + err + ' !!!!!!!!!!!!!!');

        //FmD: <deviceId> not locked remotly, time: <time>
        msg = 'FmD: ' + self._deviceId + ' not locked remotly, time: ' + self._getTime();
      } else {
        //FmD: <deviceId> locked remotly at time: <time>[, code: <passcode>]
        msg = 'FmD: ' + self._deviceId + ' locked remotly at time: ' + self._getTime();
        if (passcode != null) {
          msg = msg + ', code: ' + passcode;
        }
      }

      var mobileMessage = navigator.mozMobileMessage;
      if (mobileMessage) {
        console.log('!!!!!!!!!!!!!! [privacy-panel] send sms, to = ' + number + ', body = ' + msg + ' !!!!!!!!!!!!!!');
        mobileMessage.send(number, msg);
      }

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

  _locate : function (number) {
    var self = this;
    var locateReply = function (res, err) {
      var msg;

      if (!res) {
        console.log('!!!!!!!!!!!!!! [privacy-panel] locate err = ' + err + ' !!!!!!!!!!!!!!');

        //FmD: <deviceId> not located, time: <time>
        msg = 'FmD: ' + self._deviceId + ' not located, time: ' + self._getTime();
      } else {
        var pos = err;
        var latitude = pos.coords.latitude;
        var longitude = pos.coords.longitude;

        //FmD: <deviceId> located <@latitude,longitude> time: <time>
        msg = 'FmD: ' + self._deviceId + ' located @' + latitude + ',' + longitude + ', time: ' + self._getTime();
      }

      var mobileMessage = navigator.mozMobileMessage;
      if (mobileMessage) {
        console.log('!!!!!!!!!!!!!! [privacy-panel] send sms, to = ' + number + ', body = ' + msg + ' !!!!!!!!!!!!!!');
        mobileMessage.send(number, msg);
      }

      if (res) {
        //lock phone (only once)
        if (!self._resetRequired) {
          setTimeout(function () {
            self._lock(number)
          }, 3000);
        }

        //set reset flag
        self._setResetRequired();
      }
    };
    Commands.invokeCommand('track', [6, locateReply]);
  },

  _wipe : function () {
    var wipeReply = function (res) {
      if (res) {
        console.log('!!!!!!!!!!!!!! [privacy-panel] wipe OK !!!!!!!!!!!!!!');
      }
    };
    Commands.invokeCommand('erase', [wipeReply]);
  },

  _getTime : function () {
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
    if (str.length == 2) {
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
