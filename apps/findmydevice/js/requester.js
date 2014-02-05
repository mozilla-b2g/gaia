/* global hawk */
/* global Config */

'use strict';

var Requester = {
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

    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('POST', url);
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
          {payload: xhr.response});
      }

      if (!valid) {
        return;
      }

      if (xhr.status == 200 && onsuccess) {
        onsuccess(JSON.parse(xhr.response));
      } else if (xhr.status !== 200 && onerror) {
        onerror(xhr);
      }
    };

    xhr.onerror = function fmd_xhr_onerror() {
      onerror && onerror(xhr);
    };

    xhr.send(data);
  }
};

navigator.mozL10n.ready(Requester.init.bind(Requester));
