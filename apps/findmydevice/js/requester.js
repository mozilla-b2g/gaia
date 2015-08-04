/* global hawk */
/* global Config */
/* global DUMP */

'use strict';

var Requester = {
  XHR_TIMEOUT_MS: 60000,

  _url: null,

  _hawkCredentials: null,

  init: function fmdr_init() {
    this._url = Config.api_url + '/' + Config.api_version;
  },

  setHawkCredentials: function fmdr_set_hawk_credentials(id, key) {
    this._hawkCredentials = {
      id: id,
      key: key,
      algorithm: 'sha256'
    };
  },

  post: function fmdr_post(url, data, onsuccess, onerror) {
    url = this._url + url;
    data = JSON.stringify(data);
    DUMP('POST-ing to ' + url + ': ' + data);

    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('POST', url);
    xhr.timeout = this.XHR_TIMEOUT_MS;
    xhr.setRequestHeader('Content-Type', 'application/json');

    var hawkHeader = null;
    if (this._hawkCredentials) {
      var hawkOptions = {
        credentials: this._hawkCredentials,
        contentType: 'application/json',
        payload: data
      };

      hawkHeader = hawk.client.header(url, 'POST', hawkOptions);
      xhr.setRequestHeader('Authorization', hawkHeader.field);
    }

    xhr.onload = function fmdr_xhr_onload() {
      var valid = true;
      if (hawkHeader !== null) {
        valid = hawk.client.authenticate(
          xhr, this._hawkCredentials, hawkHeader.artifacts,
          {payload: xhr.responseText});
      }

      if (!valid) {
        DUMP('ignoring invalid HAWK signature');
        return;
      }

      if (xhr.status == 200) {
        DUMP('successful request, response: ' + xhr.response);
        onsuccess && onsuccess(JSON.parse(xhr.responseText));
      } else if (xhr.status !== 200) {
        DUMP('request failed with status ' + xhr.status);
        onerror && onerror(xhr);
      }
    };

    xhr.onerror = function fmd_xhr_onerror() {
      DUMP('request failed with status ' + xhr.status);
      onerror && onerror(xhr);
    };

    xhr.ontimeout = function fmd_xhr_ontimeout() {
      DUMP('server request timed out!');
      xhr.onerror();
    };

    xhr.send(data);
  },

  promisePost: function fmdr_promise_post(url, data) {
    var ret = new Promise((resolve, reject) => {
      this.post(url, data, response => resolve(response), err => reject(err));
    });

    return ret;
  }
};

Requester.init();
