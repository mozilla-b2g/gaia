Evme.Location = new function Evme_Location() {
  var NAME = 'Location', self = this,
      lastUpdateTime = 0,
      timeoutRequest = null,

      requestTimeout = 'FROM CONFIG',
      refreshInterval = 'FROM CONFIG',

      // since we update location right before apps are rendered
      // we give it a timeout so it doesn't block the actual rendering
      TIMEOUT_BEFORE_UPDATING_LOCATION = 2000;

  this.init = function init(options) {
    options || (options = {});

    refreshInterval = options.refreshInterval;
    requestTimeout = options.requestTimeout;

    Evme.EventHandler.trigger(NAME, 'init');
  };

  this.requestUserLocation = function requestUserLocation() {
    window.clearTimeout(timeoutRequest);
    timeoutRequest = window.setTimeout(function requestLocation() {
    var hadError = false;

    // this method prevents double error-reporting
    // in case we get both error and timeout, for example
    function reportError(data) {
      if (!hadError) {
        hadError = true;
        cbError(data);
      }
    }

    cbRequest();

    navigator.geolocation.getCurrentPosition(function onLocationSuccess(data) {
      if (!data || !data.coords) {
        reportError(data);
      } else if (!hadError) {
        cbSuccess(data);
      }
    }, reportError,
    { 'timeout': requestTimeout });
    }, TIMEOUT_BEFORE_UPDATING_LOCATION);
  };

  this.updateIfNeeded = function updateIfNeeded() {
    if (self.shouldUpdate()) {
      self.requestUserLocation();
      return true;
    }
    return false;
  };

  this.shouldUpdate = function shouldUpdate() {
    return Date.now() - lastUpdateTime > refreshInterval;
  };

  function cbRequest() {
    Evme.EventHandler.trigger(NAME, 'request');
  }

  function cbSuccess(data) {
    lastUpdateTime = Date.now();

    Evme.EventHandler.trigger(NAME, 'success', {
      'position': data
    });
  }

  function cbError(data) {
    Evme.EventHandler.trigger(NAME, 'error', data);
  }
}
