'use strict';

// Utilities for sending data to the FxOS Telemetry Server

(function(exports) {
  const DEFAULT_URL = 'https://fxos.telemetry.mozilla.org/submit/telemetry';
  const DEFAULT_APPNAME = 'FirefoxOS';
  const UNKNOWN = 'unknown';

  const TR = TelemetryRequest;

  // Set to true to enable debugging
  TR.DEBUG = false;

  // Create an XHR for the FxOS Telemetry Server.
  // Arguments:
  //   args: Telemetry arguments
  //     - reason: 'reason' URL field (i.e 'ftu' or 'appusage'. required)
  //     - deviceID: unique ID tied to the device or request (required)
  //     - url: base URL for the telemetry server
  //            (default: https://fxos.telemetry.mozilla.org/submit/telemetry)
  //     - ver: Payload version (default: 1)
  //     - appName: appName URL field (default: FirefoxOS)
  //     - appUpdateChannel: update channel URL field (default: 'unknown')
  //     - appBuildID: buildID URL field (default 'unknown')
  //     - appVersion: app version URL field (default 'unknown')
  //   info: Arbitrary JSON serializable data that will be recorded by Telemetry
  function TelemetryRequest(args, info) {
    if (!args) {
      throw new Error('No arguments');
    }

    if (!args.reason) {
      throw new Error('No reason given');
    }

    if (!args.deviceID) {
      throw new Error('No deviceID given');
    }

    // clone so we don't put data into the object that was given to us
    this.info = info ? JSON.parse(JSON.stringify(info)) : {};
    this.packet = {
      ver: args.ver || 1,
      info: this.info
    };

    this.info.reason = args.reason;
    this.info.appName = args.appName || DEFAULT_APPNAME;
    this.info.appUpdateChannel = args.appUpdateChannel || UNKNOWN;
    this.info.appBuildID = args.appBuildID || UNKNOWN;
    this.info.appVersion = args.appVersion || UNKNOWN;

    var uriParts = [
      args.url || DEFAULT_URL,
      encodeURIComponent(args.deviceID),
      encodeURIComponent(this.info.reason),
      encodeURIComponent(this.info.appName),
      encodeURIComponent(this.info.appVersion),
      encodeURIComponent(this.info.appUpdateChannel),
      encodeURIComponent(this.info.appBuildID)
    ];

    this.url = uriParts.join('/');
  }

  function debug(...args) {
    if (TR.DEBUG) {
      args.unshift('[Telemetry]');
      console.log.apply(console, args);
    }
  }

  // Open and send the underlying XMLHttpRequest
  // xhrAttrs: attributes to set on the XHR
  //   - timeout: The timeout for the request
  //   - onload / onerror / onabort / ontimeout: callbacks
  TelemetryRequest.prototype.send = function(xhrAttrs) {
    var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });

    xhr.open('POST', this.url);
    debug(this.url);

    if (xhrAttrs && xhrAttrs.timeout) {
      xhr.timeout = xhrAttrs.timeout;
    }

    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.responseType = 'text';

    var data = JSON.stringify(this.packet);
    xhr.send(data);
    debug(data);

    if (xhrAttrs) {
      xhr.onload = xhrAttrs.onload;
      xhr.onerror = xhrAttrs.onerror;
      xhr.onabort = xhrAttrs.onabort;
      xhr.ontimeout = xhrAttrs.ontimeout;
    }

    return xhr;
  };

  exports.TelemetryRequest = TelemetryRequest;
}(window));
