'use strict';

Evme.api = new function Evme_api() {
  var self = this,
  PROTOCOL = 'https',
  DEFAULT_API_HOST = 'api.everything.me',
  API_VERSION = '2.1',
  API_HOST = DEFAULT_API_HOST,
  BASE_URL = PROTOCOL + '://' + API_HOST + '/everything/' + API_VERSION + '/',
  USE_POST = true;

  this.init = function init() {};

  this.setHost = function setHost(hostName) {
    if (hostName) {
      API_HOST = hostName;
    }
  };

  this.getHost = function getHost() {
    return API_HOST;
  };

  this.getBaseURL = function getBaseURL() {
    return BASE_URL;
  };

  this.App = new function App() {
    this.close = function close(options, callback) {
      return request('App/close', options, callback);
    };
    this.icons = function icons(options, callback) {
      return request('App/icons', options, callback);
    };
    this.nativeInfo = function nativeInfo(options, callback) {
      return request('App/nativeInfo', options, callback);
    };
  };

  this.Device = new function Device() {
    this.update = function update(options, callback) {
      return request('Device/update', options, callback);
    };
  };

  this.Location = new function Location() {
    this.search = function search(options, callback) {
      return request('Location/search', options, callback);
    };
    this.set = function set(options, callback) {
      return request('Location/set', options, callback);
    };
  };

  this.Logger = new function Logger() {
    this.error = function error(options, callback) {
      return request('Logger/error', options, callback);
    };
    this.info = function info(options, callback) {
      return request('Logger/info', options, callback);
    };
    this.warn = function warn(options, callback) {
      return request('Logger/warn', options, callback);
    };
  };

  this.Search = new function Search() {
    this.apps = function apps(options, callback) {
      return request('Search/apps', options, callback);
    };
    this.suggestions = function suggestions(options, callback) {
      return request('Search/suggestions', options, callback);
    };
    this.external = function external(options, callback) {
      return request('Search/external', options, callback);
    };
    this.bgimage = function bgimage(options, callback) {
      return request('Search/bgimage', options, callback);
    };
    this.disambiguate = function disambiguate(options, callback) {
      return request('Search/disambiguate', options, callback);
    };
  };

  this.Session = new function Session() {
    this.init = function init(options, callback) {
      return request('Session/init', options, callback, false);
    };
  };

  this.Shortcuts = new function Shortcuts() {
    this.get = function get(options, callback) {
      return request('Shortcuts/get', options, callback);
    };
    this.set = function set(options, callback) {
      return request('Shortcuts/set', options, callback);
    };
    this.suggestions = function suggestions(options, callback) {
      return request('Shortcuts/suggestions', options, callback);
    };
  };

  this.Stats = new function Stats() {
    this.report = function report(options, callback) {
      return request('Stats/report', options, callback);
    };
  };

  function request(method, options, callback, isSecured) {
    !options && (options = {});

    var url = BASE_URL + method,
    finalUrl = url,
    params = Evme.Utils.serialize(options),
    httpRequest = new XMLHttpRequest(),
    value;

    finalUrl += '?' + params;

    httpRequest.open('POST', url, true);
    httpRequest.setRequestHeader('Content-Type',
                                  'application/x-www-form-urlencoded');
    httpRequest.onreadystatechange = function onReadyStateChange(e) {
      if (httpRequest.readyState == 4) {
        var response = null;

        try {
          response = JSON.parse(httpRequest.responseText);
        } catch (ex) {}

        if (response) {
          callback(response, finalUrl);
        }
      }
    };
    httpRequest.withCredentials = true;
    httpRequest.send(params);

    return {
      'request': httpRequest,
      'url': finalUrl
    };
  }

  self.init();
}
