(function(exports) {
  'use strict';

  /**
   * Return the current application object
   */
  var _app;
  function getAppObject(cb) {
    if (_app) {
      cb(_app);
      return;
    }

    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
      cb(request.result);
    };
    request.onerror = function() {
      console.warn('about:netError error fetching app: ' + request.error.name);
      cb();
    };
  }

  function getFrameType(error) {
    return isFramed(error) ? 'framed' : 'no-frame';
  }

  /**
   * Check if net_error is coming from within an iframe
   */
  function isFramed(error) {
    var manifestURL = error.m;

    // frame type values (regular, browser, app)
    var frameType = error.f;
    switch (frameType) {

      // if we are in a "regular" frame, we are indeed framed
      case 'regular':
        return true;

      // if we are an "app" frame, we are not framed
      case 'app':
        return false;

      // If we are in a "browser" frame, we are either in a browser tab/system
      // bookmark, or mozbrowser iframe within in app. Since system
      // bookmarks are considered unframed, we must perform a check here to
      // distinguish between the two cases.
      case 'browser':
        return manifestURL !== window.SYSTEM_MANIFEST;

      default:
        throw new Error('about:netError: invalid frame type - ' + frameType);
    }
  }

  /**
   * Retrieve the application name, if we are not in the context
   * of an app simply return the URI
   */
  function getAppName(cb) {
    getAppObject(function(app) {
      if (app && app.manifest.name) {
        cb(app.manifest.name);
      } else {
        cb(location.protocol + '//' + location.host);
      }
    });
  }

  /**
   * Populate element with localized string
   */
  var localizeElement = navigator.mozL10n.setAttributes;

  /**
   * Parse the neterror information that's sent to us as part of the documentURI
   * and return an error object.
   *
   * The error object will contain the following attributes:
   * e - Type of error (eg. 'netOffline').
   * u - URL that generated the error.
   * m - Manifest URI of the application that generated the error.
   * c - Character set for default gecko error message (eg. 'UTF-8').
   * d - Default gecko error message.
   * f - The frame type ("regular", "browser", "app")
   */
  var _error;
  function getErrorFromURI() {
    if (_error) {
      return _error;
    }
    _error = {};
    var uri = document.documentURI;

    // Quick check to ensure it's the URI format we're expecting.
    if (!uri.startsWith('about:neterror?')) {
      // A blank error will generate the default error message (no network).
      return _error;
    }

    // Small hack to get the URL object to parse the URI correctly.
    var url = new URL(uri.replace('about:', 'http://'));

    // Set the error attributes.
    ['e', 'u', 'm', 'c', 'd', 'f'].forEach(
      function(v) {
        _error[v] = url.searchParams.get(v);
      }
    );

    switch (_error.e) {
      case 'connectionFailure':
      case 'netInterrupt':
      case 'netTimeout':
      case 'netReset':
        _error.e = 'connectionFailed';
        break;

      case 'unknownSocketType':
      case 'unknownProtocolFound':
      case 'cspFrameAncestorBlocked':
        _error.e = 'invalidConnection';
        break;
    }

    return _error;
  }

  /*
   * This method reloads the window if the device is online and in the
   * foreground
   */
  function reloadIfOnline() {
    if (navigator.onLine && !document.hidden &&
        !document.body.classList.contains('hidden')) {
      document.body.classList.add('hidden');
      NetError.reload(true);
      window.addEventListener('offline', function onOffline() {
        window.removeEventListener('offline', onOffline);
        document.body.classList.remove('hidden');
      });
    }
  }

  function showSettingsView() {
    var activity = new window.MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'root',
        filterBy: 'connectivity'
      }
    });

    activity.onerror = function() {
      console.warn('Configure activity error:', activity.error.name);
    };
  }

  function hasHistory() {
    return window.history.length > 1;
  }

  function cancel() {
    hasHistory() ? goBack() : closeWindow();
  }

  function goBack() {
    window.history.back();
  }

  function closeWindow() {
    window.close();
  }

  function addConnectionHandlers() {
    document.addEventListener('visibilitychange', reloadIfOnline);
    window.addEventListener('online', reloadIfOnline);
  }

  var ErrorView = function(error, title, message) {
    this.error = error;
    this.titleText = title || 'unable-to-connect';
    this.messageText = message || this.error.d;
    this.node = document.getElementById('net-error-confirm-dialog');
  };

  ErrorView.prototype = {
    applyStyle: function ew_applyStyle() {
      document.body.classList.add(this.error.e);
    },

    addHandlers: function ew_addHandlers() {
      // Subclasses should add the handlers
    },

    populateMessages: function ew_populateMessages() {
      localizeElement(this.title, this.titleText);
      localizeElement(this.message, this.messageText);
    },

    init: function ew_init() {
      window.LazyLoader.load(this.node, (function loaded() {
        this.title = document.getElementById('error-title');
        this.message = document.getElementById('error-message');
        this.applyStyle();
        this.populateMessages();
        this.addHandlers();
      }).bind(this));
    }
  };

  var FramedErrorView = function(error, title, message) {
    ErrorView.call(this, error, title, message);
  };

  FramedErrorView.prototype = Object.create(ErrorView.prototype);

  FramedErrorView.prototype.applyStyle = function few_applyStyle() {
    ErrorView.prototype.applyStyle.call(this);
    document.body.classList.add('framed');
  };

  FramedErrorView.prototype.addHandlers = function few_addHandlers() {
    document.body.onclick = function bodyClick() {
      document.getElementById('retry-icon').classList.remove('still');
      NetError.reload(true);
    };
  };

  var AppErrorView = function(error, title, message) {
    ErrorView.call(this, error, title, message);
  };

  AppErrorView.prototype = Object.create(ErrorView.prototype);

  AppErrorView.prototype.applyStyle = function few_applyStyle() {
    ErrorView.prototype.applyStyle.call(this);
    document.body.classList.add('no-frame');
  };

  AppErrorView.prototype.addHandlers = function aew_addHandlers() {
    document.getElementById('retry-btn').onclick = function retryClick() {
      NetError.reload(true);
    };
    document.getElementById('close-btn').onclick = closeWindow;
  };

  // Dns error view
  var DnsErrorAppErrorView = function(error, title, message) {
    AppErrorView.call(this, error, title, message);
  };

  DnsErrorAppErrorView.prototype = Object.create(AppErrorView.prototype);

  DnsErrorAppErrorView.prototype.populateMessages =
  function noew_populateMessages() {
    localizeElement(this.title, this.titleText);
    localizeElement(this.message, this.messageText,
                    { name: '\u2068' + this.error.u + '\u2069' });
  };

  var DnsErrorFramedErrorView = function(error, title, message) {
    FramedErrorView.call(this, error, title, message);
  };

  DnsErrorFramedErrorView.prototype = Object.create(FramedErrorView.prototype);

  DnsErrorFramedErrorView.prototype.populateMessages =
  function noew_populateMessages() {
    localizeElement(this.title, this.titleText);
    localizeElement(this.message, this.messageText,
                    { name: '\u2068' + this.error.u + '\u2069' });
  };

  // Offline view
  var NetOfflineAppErrorView = function(error) {
    AppErrorView.call(this, error);
    this.node = document.getElementById('net-error-action-menu');
  };

  NetOfflineAppErrorView.prototype = Object.create(AppErrorView.prototype);

  NetOfflineAppErrorView.prototype.populateMessages =
  function noew_populateMessages() {
    if (hasHistory()) {
      localizeElement(this.title, 'network-error-in-app');
    } else {
      getAppName((function localizeTitle(appName) {
        localizeElement(this.title, 'network-error-launching', {
          name: appName
        });
      }).bind(this));
    }
  };

  NetOfflineAppErrorView.prototype.addHandlers = function noew_addHandlers() {
    addConnectionHandlers();
    document.getElementById('settings-btn').onclick = showSettingsView;
    document.getElementById('cancel-btn').onclick = cancel;
  };

  var NetOfflineFramedErrorView = function(error) {
    FramedErrorView.call(this, error);
  };

  NetOfflineFramedErrorView.prototype =
    Object.create(FramedErrorView.prototype);

  NetOfflineFramedErrorView.prototype.populateMessages =
  function noew_populateMessages() {
    localizeElement(this.title, 'unable-to-connect');
    localizeElement(this.message, 'tap-to-check-settings');
  };

  NetOfflineFramedErrorView.prototype.addHandlers =
  function noew_addHandlers() {
    addConnectionHandlers();
    document.body.onclick = showSettingsView;
  };

  // Confirm views
  var ConfirmAppErrorView = function(error, title, message) {
    AppErrorView.call(this, error, title, message);
  };

  ConfirmAppErrorView.prototype = Object.create(AppErrorView.prototype);

  ConfirmAppErrorView.prototype.applyStyle = function caew_applyStyle() {
    AppErrorView.prototype.applyStyle.call(this);
    document.body.classList.add('dialog');
  };

  // Alert view
  var AlertAppErrorView = function(error, title, message) {
    AppErrorView.call(this, error, title, message);
  };

  AlertAppErrorView.prototype = Object.create(AppErrorView.prototype);

  AlertAppErrorView.prototype.applyStyle = function aaew_applyStyle() {
    AppErrorView.prototype.applyStyle.call(this);
    document.body.classList.add('dialog', 'alert');
  };

  var views = {
    netOffline: {
      'framed': NetOfflineFramedErrorView,
      'no-frame': NetOfflineAppErrorView
    },
    dnsNotFound: {
      'framed': DnsErrorFramedErrorView,
      'no-frame': DnsErrorAppErrorView,
      'title': 'server-not-found',
      'message': 'server-not-found-error'
    },
    connectionFailed: {
      'framed': FramedErrorView,
      'no-frame': ConfirmAppErrorView,
      'title': 'connection-failed',
      'message': 'connection-failed-error'
    },
    notCached: {
      'framed': FramedErrorView,
      'no-frame': ConfirmAppErrorView,
      'title': 'not-cached',
      'message': 'not-cached-error'
    },
    fileNotFound: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'file-not-found',
      'message': 'file-not-found-error'
    },
    invalidConnection: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'invalid-connection',
      'message': 'invalid-connection-error'
    },
    malformedURI: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'malformed-uri',
      'message': 'malformed-uri-error'
    },
    redirectLoop: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'redirect-loop',
      'message': 'redirect-loop-error'
    },
    isprinting: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'message': 'is-printing-error'
    },
    deniedPortAccess: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'denied-port-access',
      'message': 'denied-port-access-error'
    },
    proxyResolveFailure: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'proxy-resolve-failure',
      'message': 'proxy-resolve-failure-error'
    },
    proxyConnectFailure: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'proxy-connect-failure',
      'message': 'proxy-connect-failure-error'
    },
    contentEncodingError: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'content-encoding',
      'message': 'content-encoding-error'
    },
    remoteXUL: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'remote-xul',
      'message': 'remote-xul-error'
    },
    unsafeContentType: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'unsafe-content-type',
      'message': 'unsafe-content-type-error'
    },
    corruptedContentError: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'corrupted-content',
      'message': 'corrupted-content-error'
    },
    phishingBlocked: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'phishing-blocked',
      'message': 'phishing-blocked-error'
    },
    malwareBlocked: {
      'framed': FramedErrorView,
      'no-frame': AlertAppErrorView,
      'title': 'malware-blocked',
      'message': 'malware-blocked-error'
    },
    byDefault: {
      'framed': FramedErrorView,
      'no-frame': AppErrorView
    }
  };

  var ErrorViewFactory = {
    create: function nef_create() {
      var error = getErrorFromURI();
      var view = views[error.e] || views.byDefault;
      return new view[getFrameType(error)](error, view.title,
                                           view.message);
    }
  };

  /**
   * Initialize the page
   */
  function initPage() {
    _error = _app = null;
    // Display detailed info about the error.
    console.error('net-error');
    ErrorViewFactory.create().init();
  }

  navigator.mozL10n.ready(initPage);

  var NetError = {
    init: initPage,

    reload: function reload(forcedReload) {

      // When reloading a page with POSTDATA the user will be prompted to
      // confirm if he wants to resend the data. If the user accepted to resend
      // the data, during the reload function call the onbeforeunload event is
      // fired, otherwise if the event is not triggered then the last url from
      // the history is loaded.
      var isReloading = false;
      window.addEventListener('beforeunload', function onBeforeunload() {
        isReloading = true;
      });

      window.location.reload(forcedReload);

      if (!isReloading) {
        history.back();
      }
    }
  };

  exports.NetError = NetError;
}(this));
