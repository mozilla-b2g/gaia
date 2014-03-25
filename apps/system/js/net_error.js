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
  function localizeElement(el, key, args) {
    el.textContent = navigator.mozL10n.get(key, args);
  }

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

  var ErrorView = function(error) {
    this.error = error;
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
      localizeElement(this.title, 'unable-to-connect');
      this.message.textContent = this.error.d;
    },

    init: function ew_init() {
      window.LazyLoader.load(this.node, (function loaded() {
        navigator.mozL10n.translate(this.node);
        this.title = document.getElementById('error-title');
        this.message = document.getElementById('error-message');
        this.applyStyle();
        this.populateMessages();
        this.addHandlers();
      }).bind(this));
    }
  };

  var FramedErrorView = function(error) {
    ErrorView.call(this, error);
  };

  FramedErrorView.prototype = {
    __proto__: ErrorView.prototype,

    applyStyle: function few_applyStyle() {
      ErrorView.prototype.applyStyle.call(this);
      document.body.classList.add('framed');
    },

    addHandlers: function few_addHandlers() {
      document.body.onclick = function bodyClick() {
        document.getElementById('retry-icon').classList.remove('still');
        NetError.reload(true);
      };
    }
  };

  var AppErrorView = function(error) {
    ErrorView.call(this, error);
  };

  AppErrorView.prototype = {
    __proto__: ErrorView.prototype,

    applyStyle: function few_applyStyle() {
      ErrorView.prototype.applyStyle.call(this);
      document.body.classList.add('no-frame');
    },

    addHandlers: function aew_addHandlers() {
      document.getElementById('retry-btn').onclick = function retryClick() {
        NetError.reload(true);
      };
      document.getElementById('close-btn').onclick = closeWindow;
    }
  };

  // Server not found views

  var DnsNotFoundHelper = {
    populateMessages: function dnfh_populateMessages() {
      localizeElement(this.title, 'server-not-found');
      localizeElement(this.message, 'server-not-found-error', {
        name: location.host
      });
    }
  };

  var DnsNotFoundFramedErrorView = function(error) {
    FramedErrorView.call(this, error);
  };

  DnsNotFoundFramedErrorView.prototype = {
    __proto__: FramedErrorView.prototype,

    populateMessages: DnsNotFoundHelper.populateMessages
  };

  var DnsNotFoundAppErrorView = function(error) {
    AppErrorView.call(this, error);
  };

  DnsNotFoundAppErrorView.prototype = {
    __proto__: AppErrorView.prototype,

    populateMessages: DnsNotFoundHelper.populateMessages
  };

  // Offline view
  var NetOfflineAppErrorView = function(error) {
    AppErrorView.call(this, error);
    this.node = document.getElementById('net-error-action-menu');
  };

  NetOfflineAppErrorView.prototype = {
    __proto__: AppErrorView.prototype,

    populateMessages: function noew_populateMessages() {
      if (hasHistory()) {
        localizeElement(this.title, 'network-error-in-app');
      } else {
        getAppName((function localizeTitle(appName) {
          localizeElement(this.title, 'network-error-launching', {
            name: appName
          });
        }).bind(this));
      }
    },

    addHandlers: function noew_addHandlers() {
      addConnectionHandlers();
      document.getElementById('settings-btn').onclick = showSettingsView;
      document.getElementById('cancel-btn').onclick = cancel;
    }
  };

  var NetOfflineFramedErrorView = function(error) {
    FramedErrorView.call(this, error);
  };

  NetOfflineFramedErrorView.prototype = {
    __proto__: FramedErrorView.prototype,

    populateMessages: function noew_populateMessages() {
      localizeElement(this.title, 'unable-to-connect');
      localizeElement(this.message, 'tap-to-check-settings');
    },

    addHandlers: function noew_addHandlers() {
      addConnectionHandlers();
      document.body.onclick = showSettingsView;
    }
  };

  var views = {
    dnsNotFound: {
      'framed': DnsNotFoundFramedErrorView,
      'no-frame': DnsNotFoundAppErrorView
    },
    netOffline: {
      'framed': NetOfflineFramedErrorView,
      'no-frame': NetOfflineAppErrorView
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
      return new view[getFrameType(error)](error);
    }
  };

  /**
   * Initialize the page
   */
  function initPage() {
    _error = _app = null;
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
