/* global dump, applications, AppWindowManager, Notification*/
'use strict';

(function(exports) {
  var DEBUG = false;
  var HOST = '127.0.0.1';
  var PORT = 33334;
  var RETRY_TIMEOUT = 1000;
  var POLL_TIMEOUT = 60000 * 5; // 5 minutes
  var SETTINGS_KEY = 'app-compatibility.enabled';
  var NOTIFICATION_PREFIX = 'ACL_NOTIFICATION';

  function debug() {
    DEBUG && dump('[ACL] ' +
      Array.slice(arguments).join(', ') + '\n');
  }

  function getRandomString() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '');
  }

  var AppCompatibility = function() {
    this.connectionAttempts = 0;
    this.socket = null;
    this.buffer = '';
    this.notifications = [];
  };

  AppCompatibility.prototype.start = function() {
    this.listenForExternalApps();
    var req = navigator.mozSettings.createLock().get(SETTINGS_KEY);
    req.onsuccess = function() {
      if (req.result[SETTINGS_KEY] === true) {
        debug('ACL setting enabled, starting');
        this.checkForExternalApps();
      } else {
        debug('ACL setting disabled');
      }
    }.bind(this);

    req.onerror = function(e) {
      debug('Unable to fecth acl settings', e);
    };
  };

  AppCompatibility.prototype.isExternalApp = function(manifest) {
    return manifest && manifest.permissions &&
           manifest.permissions['external-app'];
  };

  AppCompatibility.prototype.listenForExternalApps = function() {
    window.addEventListener('applicationinstall', function(evt) {
      var app = evt.detail.application;
      if (this.isExternalApp(app.manifest)) {
        debug('external app installed, attempting to connect');
        this.attemptToConnect();
      }
    }.bind(this));
  };

  AppCompatibility.prototype.checkForExternalApps = function() {
    var req = navigator.mozApps.mgmt.getAll();
    req.onsuccess = function() {
      var apps = req.result;
      var lastApp = null;
      var found = apps.some(function(app) {
        lastApp = app;
        return this.isExternalApp(app.manifest);
      }.bind(this));
      if (found) {
        debug('External app already installed, attempting to connect');
        this.attemptToConnect();
      }
    }.bind(this);

    req.onerror = function(e) {
      debug('Unable to fetch apps ', e);
    };
  };

  AppCompatibility.prototype.attemptToConnect = function() {
    debug('Starting acl connection attempt');
    this.connectionAttempts = 0;
    this.openConnection();
  };

  AppCompatibility.prototype.openConnection = function() {
    if (this.socket) {
      debug('Cannot connect, already have socket');
      return;
    }

    // Check for polling timeout.
    this.connectionAttempts++;
    if (this.connectionAttempts > POLL_TIMEOUT / RETRY_TIMEOUT) {
      debug('Poll timeout reached, giving up');
      return;
    }

    try {
      this.socket = navigator.mozTCPSocket.open(HOST, PORT);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.ondata = this.handleData.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
    } catch (e) {
      this.handleSocketError(e);
    }
  };

  AppCompatibility.prototype.handleSocketError = function(e) {
    debug('Error connecting: ' + JSON.stringify(e));
    this.socket = null;
    setTimeout(this.openConnection.bind(this), RETRY_TIMEOUT);
  };

  AppCompatibility.prototype.handleOpen = function() {
    debug('CONNECTION SUCCESS!');
  };

  AppCompatibility.prototype.handleClose = function(evt) {
    debug('Closed connections: ' + evt.type);
    this.socket = null;
    setTimeout(this.openConnection.bind(this), RETRY_TIMEOUT);
  };

  AppCompatibility.prototype.handleData = function(evt) {
    var data = evt.data;
    this.buffer += data;
    var i = this.buffer.indexOf('\n');
    while (i !== -1) {
      var msg = this.buffer.slice(0, i);
      this.buffer = this.buffer.slice(i + 1);
      this.handleMessage(msg);
      i = this.buffer.indexOf('\n');
    }
  };

  AppCompatibility.prototype.serializeMessage = function(obj) {
    return JSON.stringify(obj) + '\n';
  };

  AppCompatibility.prototype.sendMessage = function(msg) {
    if (!this.socket) {
      debug('Cannot send message, no connection', msg);
    }
    this.socket.send(this.serializeMessage(msg));
  };

  AppCompatibility.prototype.getAppFromMessage = function(msg) {
    var app = null;
    if (msg.manifestURL) {
      app = applications.getByManifestURL(msg.manifestURL);
    }
    if (!app && msg.origin) {
      app = applications.getByOrigin(msg.origin);
    }
    if (!app) {
      debug('Unable to fetch app from message');
    }
    return app;
  };

  AppCompatibility.prototype.getAppIcon = function(app) {
    var smallestSize = null;
    for (var size in app.manifest.icons) {
      if (!smallestSize || size < smallestSize) {
        smallestSize = size;
      }
    }
    var iconURL = app.manifest.icons[smallestSize];
    if (iconURL.startsWith('/')) {
      iconURL = app.origin + iconURL;
    }
    return iconURL;
  };

  AppCompatibility.prototype.handleMessage = function(msg) {
    debug('processing message', msg);

    try {
      msg = JSON.parse(msg);
    } catch (e) {
      console.log('ACL: Unable to deserialize message');
      return;
    }

    var app = this.getAppFromMessage(msg);
    if (!app) {
      console.log('ACL: Unable to fetch app from message');
      return;
    }

    switch (msg.action) {
      case 'launch':
        this.launchApp(app);
        break;

      case 'kill':
        this.killApp(app);
        break;

      case 'minimize':
        this.minimizeApp(app);
        break;

      case 'notify':
        this.sendNotification(app, msg);
        break;

      case 'notify-remove':
        this.removeNotification(msg.id);
        break;

       default:
        debug('unrecognized action', msg.action);
        break;
    }
  };

  AppCompatibility.prototype.launchApp = function(app) {
    window.dispatchEvent(new CustomEvent('webapps-launch', {
      detail: {
        manifestURL: app.manifestURL,
        url: app.origin + app.manifest.launch_path,
        timestamp: Date.now()
      }
    }));
  };

  AppCompatibility.prototype.killApp = function(app) {
    if (this.isExternalApp(app.manifest)) {
      AppWindowManager.kill(app.origin, app.manifestURL);
    }
  };

  AppCompatibility.prototype.minimizeApp = function(app) {
    // Only minimize requested app if it is active.
    if (AppWindowManager.getActiveApp().manifestURL === app.manifestURL) {
      window.dispatchEvent(new CustomEvent('home'));
    }
  };

  AppCompatibility.prototype.sendNotification = function(app, detail) {
    if (!detail.id) {
      debug('No id received with notification, cannot fire click callback');
      detail.id = getRandomString() + Date.now();
    }

    if (!detail.icon) {
      detail.icon = this.getAppIcon(app);
    }

    if (detail.silent) {
      detail.icon += '#silent=1';
    }

    var n = new Notification(detail.title || '', {
      body: detail.body || '',
      icon: detail.icon,
      tag: NOTIFICATION_PREFIX + detail.id
    });

    n.onclick = function() {
      this.sendMessage({
        action: 'notify-click',
        id: detail.id,
        origin: detail.origin
      });
    }.bind(this);

    this.notifications[detail.id] = n;
  };

  AppCompatibility.prototype.removeNotification = function(id) {
    if (!id || !this.notifications[id]) {
      debug('Unable to find notification for removal', id);
    } else {
      this.notifications[id].close();
      delete this.notifications[id];
    }
  };

  exports.AppCompatibility = AppCompatibility;
}(window));
