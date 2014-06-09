/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

// webdav params: url, user, password
function jsDAVConnection(params) {
  this.params = {
    url: 'http://test.webdav.org/dav/',
    user: '',
    password: ''
  };

  this.serverInfo = {
    DAV: undefined,
    Allow: undefined
  };

  this.rootInfo = {};

  if (params.url) {
    this.params.url = params.url;
  }
  if (params.user && params.password) {
    this.params.user = params.user;
    this.params.password = params.password;
  }

  // Recover ROOT folder resource
  var self = this;
  jsDAVlib.comms.checkRepository(this, function(props, error) {
    if (error) {
      jsDAVlib.debug('ERROR: ' + error);
      return self.onerror(error);
    }

    self.serverInfo = props;
    jsDAVlib.debug('Server ' + self.params.url + ' capacities', self.serverInfo);

    jsDAVlib.comms.getResourceInfo(self, '', function(DAVResource, error) {
      self.rootInfo = DAVResource.getMetadata();
      self.rootInfo.isDAVResource = !DAVResource.isException();
      self.rootInfo.isAddressBook = DAVResource.isAddressBook();
      self.rootInfo.isCalendar = DAVResource.isCalendar();

      // FIX Base URL
      // All resourceURL will be relative to the base path. We can guess this
      // base path based on the href returned by the first element of the root
      // resource
      var absoluteURL = self.params.url;
      var relativeURL = self.rootInfo.href;
      if (absoluteURL.substr(-1) != relativeURL.substr(-1)) {
        if (relativeURL.substr(-1) === '/')
          absoluteURL += relativeURL.substr(-1);
      }
      self.params.url = absoluteURL.substr(0, absoluteURL.indexOf(relativeURL));

      self.onready();
    });
  });
}

jsDAVConnection.prototype = {
  onready: function __override_me_onready__() {},
  onerror: function __override_me_onerror__() {},

  getInfo: function getInfo() {
    if (!this.rootInfo.isDAVResource) {
      return {
        url: this.params.url,
        error: 'Invalid DAV resource'
      };
    } else {
      return {
        url: this.params.url,
        rootInfo: this.rootInfo,
        serverInfo: this.serverInfo
      }
    }
  },

  // If resourceURL is null, then root Resource is returned
  getResource: function getContentsList(resourceURL, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    if (resourceURL === null || resourceURL === '') {
      resourceURL = this.rootInfo.href;
    }

    jsDAVlib.comms.getResource(this, resourceURL, function(DAVResource, error) {
      callback(DAVResource, error);
    });
  },

  // Write changes into the server
  writeResource: function writeDAVResource(DAVResource, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    jsDAVlib.comms.writeResource(this, DAVResource, function(status, error) {
      callback(status, error);
    });
  }
};
