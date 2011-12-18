/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {

  function _doPDP(evt) {
    dump("doPDP evt.detail = " + evt.detail);
    if(evt.detail) {
      var cdma = 1;
      var apn = "internet";
      var user = "";
      var passwd = "";
      var chappap = 0;
      var pdptype = "IP";
      
      window.navigator.mozTelephony.connect(cdma, apn, user, passwd,
					    chappap, pdptype);
    } else {
      var cid = "00001";
      var reason = "0";		// no specific reason
      // window.navigator.mozTelephony.deactivate(cid, reason);
    }
  }

  function doPDP(evt) {
    try {
      _doPDP(evt);
    } catch(e) {
      dump("doPDP exception: " + e);
    }
  }

  Gaia.SettingTypes = {
    TOGGLE_SWITCH: 'toggleSwtich',
    NUMERIC: 'numeric',
    STRING: 'string'
  };

  var _settings = [];
  var _defaultSettings = [{
    id: 'isAirplaneMode',
    view: {
      id: 'rootView',
      title: 'Settings',
      tableViewId: 'networkAndLocationSettings'
    },
    label: 'Airplane Mode',
    value: 1,
    type: Gaia.SettingTypes.TOGGLE_SWITCH,
    isOn: false
  }, {
    id: 'isWiFiEnabled',
    view: {
      id: 'rootView',
      title: 'Settings',
      tableViewId: 'networkAndLocationSettings'
    },
    label: 'Wi-Fi',
    value: 1,
    type: Gaia.SettingTypes.TOGGLE_SWITCH,
    isOn: true
  }, {
    id: 'isPDPEnabled',
    view: {
      id: 'rootView',
      title: 'Settings',
      tableViewId: 'networkAndLocationSettings'
    },
    label: '3G Data',
    value: 1,
    type: Gaia.SettingTypes.TOGGLE_SWITCH,
    isOn: true
  }, {
    id: 'isLocationEnabled',
    view: {
      id: 'rootView',
      title: 'Settings',
      tableViewId: 'networkAndLocationSettings'
    },
    label: 'Location Services',
    value: 1,
    type: Gaia.SettingTypes.TOGGLE_SWITCH,
    isOn: true
  }];

  Gaia.Settings = {
    get settings() {
      return _settings;
    },
    init: function() {
      var db = this.db;

      db.open(function() {
        db.getAllSettings(function(settings) {
          _settings = settings;

          _settings.forEach(function(setting) {
            if (!setting.view || !setting.view.id || !setting.view.tableViewId)
              return;

            var view = document.getElementById(setting.view.id);

            if (!view) {
              view = document.createElement('div');
              view.id = setting.view.id;
              view.class = 'view';
              view.setAttribute('data-title', setting.view.title);

              document.body.appendChild(view);
            }

            var tableView = document.getElementById(setting.view.tableViewId);

            if (!tableView) {
              tableView = document.createElement('ul');
              tableView.id = setting.view.tableViewId;
              tableView.class = 'tableView';

              view.appendChild(tableView);
            }

            var tableCell = document.createElement('li');
            var label = document.createElement('span');
            label.innerHTML = setting.label;
            tableCell.appendChild(label);

            if (setting.type === Gaia.SettingTypes.TOGGLE_SWITCH) {
              var input = document.createElement('input');
              input.id = input.name = setting.id;
              input.type = 'checkbox';
              input.value = setting.value;
              input.class = 'toggleSwitch';

              if (setting.isOn)
                input.setAttribute('checked', true);

              tableCell.appendChild(input);

              setting.widget = new Gaia.UI.ToggleSwitch(input);

              setting.widget.element.addEventListener('change', function(evt) {
                var isOn = evt.detail ? true : false;
                Gaia.Settings.setPropertyForSetting(setting.id, 'isOn', isOn);
              });
            }

	    if(setting.id == 'isPDPEnabled') {
	      setting.widget.element.addEventListener('change',
						      doPDP);
	    }

            tableView.appendChild(tableCell);
          });
        });
      });
    },
    setPropertyForSetting: function(id, property, value) {
      var setting = null;

      for (var i = 0; i < _settings.length; i++) {
        if (_settings[i]['id'] === id) {
          setting = _settings[i];
          break;
        }
      }

      if (!setting)
        return null;

      setting[property] = value;

      var widget = setting.widget;

      // If the setting is bound to a widget, temporarily remove it to store
      // the setting.
      if (widget)
        delete setting.widget;

      this.db.updateSetting(setting);

      // If the setting was bound to a widget, reassign it after the setting
      // is stored.
      if (widget)
        setting.widget = widget;

      return setting;
    },
    db: {
      _db: null,
      _dbName: 'settings',
      _objectStoreName: 'settings',
      _createDB: function() {
        var db = this._db;
        var store = this._objectStoreName;

        if (db.objectStoreNames.contains(store))
          db.deleteObjectStore(store);

        db.createObjectStore(store, { keyPath: 'id' });
      },
      _fillDB: function() {
        for (var i = 0; i < _defaultSettings.length; i++)
          this.updateSetting(_defaultSettings[i]);
      },
      open: function(callback) {
        var request = window.mozIndexedDB.open(this._dbName);
        var isEmpty = false;

        request.onupgradeneeded = (function(evt) {
          this._db = evt.target.result;
          this._createDB();

          isEmpty = true;
        }).bind(this);

        request.onsuccess = (function(evt) {
          this._db = evt.target.result;

          if (isEmpty)
            this._fillDB();

          callback();
        }).bind(this);

        request.onerror = (function(error) {
          console.log('Database error: ', error);
        }).bind(this);
      },
      updateSetting: function(element, callback) {
        var db = this._db;
        var store = this._objectStoreName;
        var transaction = db.transaction(store, IDBTransaction.READ_WRITE);
        var objectStore = transaction.objectStore(store);
        var request = objectStore.put(element);

        request.onsuccess = function(evt) {
          console.log('Putting element in "' + store + '" store');

          if (callback)
            callback(element);
        };

        request.onerror = function(evt) {
          var msg = 'Error while putting element in "' + store + '" store';
          console.log(msg);
        };
      },
      getAllSettings: function(callback) {
        var db = this._db;
        var store = this._objectStoreName;
        var transaction = db.transaction(store, IDBTransaction.READ_ONLY);
        var objectStore = transaction.objectStore(store);
        var request = objectStore.openCursor(IDBKeyRange.lowerBound(0));
        var elements = [];

        request.onsuccess = function(evt) {
          var result = evt.target.result;

          if (!result) {
            callback(elements);
            return;
          }

          elements.push(result.value);
          result.continue();
        };

        request.onerror = function(evt) {
          var msg = 'Error reading elements from "' + store + '" store';
          console.log(msg);
        };
      },
      getSetting: function(id, callback) {
        var db = this._db;
        var store = this._objectStoreName;
        var transaction = db.transaction(store, IDBTransaction.READ_ONLY);
        var objectStore = transaction.objectStore(store);
        var request = objectStore.get(id);

        request.onsuccess = function(evt) {
          callback(evt.target.result);
        };

        request.onerror = function(evt) {
          var msg = 'Error reading element from "' + store +
                    '" store with ID: ' + id;
          console.log(msg);
        };
      }
    }
  };

  window.addEventListener('load', function() {
    var navBar = document.getElementById('navBar');
    var rootView = document.getElementById('rootView');

    window.navController = new Gaia.UI.NavController(navBar, rootView);

    Gaia.Settings.init();
  });

})();
