/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

jsDAVlib.comms = (function jsDAVCommunications() {

  // Helpers
  function getXHR() {
    return new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });
  }

  // Callback with DAV server properties
  function checkDAVrepository(DAVConnection, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};
    var xhr = getXHR();

    xhr.onload = function checkDAVrepositoryResponse() {
      callback({
        DAV: xhr.getResponseHeader('DAV'),
        Allow: xhr.getResponseHeader('Allow')
      });
    };

    xhr.open('OPTIONS', DAVConnection.params.url, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.withCredentials = true;

    try {
      xhr.send();
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  function getDAVResourceInfo(DAVConnection, resURL, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};
    var xhr = getXHR();

    xhr.onload = function getDAVResourceInfoResponse() {
      // We SHALL receive a MULTISTATUS response (207) // See RFC 4918
      if (xhr.status != 207 || !xhr.responseXML) {
        return callback(null, 'No valid DAV XML Response');
      }
      var DAVResource = new jsDAVlib.DAVResource(xhr.responseXML);
      if (DAVResource.isException()) {
        return callback(null, DAVResource.getExceptionInfo());
      }

      if (resURL === '' || resURL === DAVConnection.getInfo().rootFolder) {
        DAVResource.setParent(null);
      } else {
        var _path = resURL.split('/');
        if (_path.pop() === '') {
          _path.pop();
          _path.push('');
        }
        DAVResource.setParent(_path.join('/'));
      }

      return callback(DAVResource);
    };

    xhr.open('PROPFIND', DAVConnection.params.url + resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.setRequestHeader('Depth', '0');
    xhr.withCredentials = 'true';
    xhr.responseType = "document";

    try {
      xhr.send(jsDAVlib.xmlParser.getQueryXML());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  // Callback with the recovered DAVResource
  function getDAVResource(DAVConnection, resURL, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    function setParentFolder(DAVResource) {
      if (resURL === '' || resURL === DAVConnection.getInfo().rootFolder) {
        DAVResource.setParent(null);
      } else {
        var _path = resURL.split('/');
        if (_path.pop() === '') {
          _path.pop();
          _path.push('');
        }
        DAVResource.setParent(_path.join('/'));
      }
    }

    var xhr = getXHR();
    xhr.onload = function getDAVResourceResponse() {
      // We SHALL receive a MULTISTATUS response (207) // See RFC 4918
      if ( (xhr.status != 207 || !xhr.responseXML) && xhr.status != 404 ) {
        return callback(null, 'No valid DAV XML Response');
      }

      if (xhr.status === 404) {
        // Some DAV servers doesn't support PROPFIND into file resources like
        // DAVMail, so we can fake a new DAVResource and try to get the file
        jsDAVlib.debug("Alternative recovering (DAVMail?)");
        var DAVResource = new jsDAVlib.DAVResource();
        setParentFolder(DAVResource);
        getFileContents(DAVConnection,
          DAVConnection.params.url + resURL, function(data, error) {
            if (data) {
              DAVResource.addFileContents(data);
              return callback(DAVResource);
            }
            callback(null, error);
          });
      } else {
        var DAVResource = new jsDAVlib.DAVResource(xhr.responseXML);
        if (DAVResource.isException()) {
          return callback(null, DAVResource.getExceptionInfo());
        }

        setParentFolder(DAVResource);

        if (DAVResource.isFile()) {
          return getFileContents(DAVConnection,
            DAVConnection.params.url + resURL, function(data, error) {
              if (data) {
                DAVResource.addFileContents(data);
                return callback(DAVResource);
              }
              callback(null, error);
            });
        }
        if (DAVResource.isCollection()) {
          return callback(DAVResource);
        }
        callback(null, 'Not recognized resource type');
      }
    };

    xhr.open('PROPFIND', DAVConnection.params.url + resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.setRequestHeader('Depth', '1');
    xhr.withCredentials = 'true';
    xhr.responseType = "document";

    try {
      xhr.send(jsDAVlib.xmlParser.getQueryXML());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  function getFileContents(DAVConnection, fileURL, callback) {
    var xhr_file = getXHR();
    xhr_file.onload = function getDAVResourceContents() {
      if (xhr_file.status < 300) callback(xhr_file.response);
      else callback(null, xhr_file.statusText);
    };
    xhr_file.open('GET', fileURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr_file.withCredentials = 'true';
    xhr_file.responseType = "text";    // TODO: Change based on mime type !
    try {
      xhr_file.send();
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  function writeDAVResource(DAVConnection, DAVResource, callback) {
    var resURL = DAVConnection.params.url + DAVResource.getMetadata().href;
    if (!DAVResource.isFile())
      return callback(null, "Resource is not a file");

    var xhr_file = getXHR();
    xhr_file.onload = function writeResourceResponse() {
      if (xhr_file.status < 300) callback(xhr_file.statusText);
      else callback(null, xhr_file.statusText);
    };
    xhr_file.open('PUT', resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr_file.withCredentials = 'true';
    try {
      xhr_file.send(DAVResource.getContents());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  return {
    checkRepository: function checkRepository(DAVConnection, callback) {
      checkDAVrepository(DAVConnection, callback);
    },

    getResourceInfo: function getResourceInfo(DAVConnection, resURL, callback) {
      getDAVResourceInfo(DAVConnection, resURL, callback);
    },

    getResource: function getResource(DAVConnection, resURL, callback) {
      getDAVResource(DAVConnection, resURL, callback);
    },

    writeResource: function writeResource(DAVConnection, DAVResource, cb) {
      writeDAVResource(DAVConnection, DAVResource, cb);
    }
  };
})();
