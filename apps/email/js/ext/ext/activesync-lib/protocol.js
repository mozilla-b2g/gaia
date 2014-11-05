/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory(require('wbxml'), require('activesync/codepages'));
  else if (typeof define === 'function' && define.amd)
    define(['wbxml', 'activesync/codepages'], factory);
  else
    root.ActiveSyncProtocol = factory(WBXML, ActiveSyncCodepages);
}(this, function(WBXML, ASCP) {
  'use strict';

  var exports = {};
  var USER_AGENT = 'JavaScript ActiveSync (jsas) Client';

  function nullCallback() {}

  /**
   * Create a constructor for a custom error type that works like a built-in
   * Error.
   *
   * @param name the string name of the error
   * @param parent (optional) a parent class for the error, defaults to Error
   * @param extraArgs an array of extra arguments that can be passed to the
   *        constructor of this error type
   * @return the constructor for this error
   */
  function makeError(name, parent, extraArgs) {
    function CustomError() {
      // Try to let users call this as CustomError(...) without the "new". This
      // is imperfect, and if you call this function directly and give it a
      // |this| that's a CustomError, things will break. Don't do it!
      var self = this instanceof CustomError ?
                 this : Object.create(CustomError.prototype);
      var tmp = Error();
      var offset = 1;

      self.stack = tmp.stack.substring(tmp.stack.indexOf('\n') + 1);
      self.message = arguments[0] || tmp.message;
      if (extraArgs) {
        offset += extraArgs.length;
        for (var i = 0; i < extraArgs.length; i++)
          self[extraArgs[i]] = arguments[i+1];
      }

      var m = /@(.+):(.+)/.exec(self.stack);
      self.fileName = arguments[offset] || (m && m[1]) || "";
      self.lineNumber = arguments[offset + 1] || (m && m[2]) || 0;

      return self;
    }
    CustomError.prototype = Object.create((parent || Error).prototype);
    CustomError.prototype.name = name;
    CustomError.prototype.constructor = CustomError;

    return CustomError;
  }

  var AutodiscoverError = makeError('ActiveSync.AutodiscoverError');
  exports.AutodiscoverError = AutodiscoverError;

  var AutodiscoverDomainError = makeError('ActiveSync.AutodiscoverDomainError',
                                          AutodiscoverError);
  exports.AutodiscoverDomainError = AutodiscoverDomainError;

  var HttpError = makeError('ActiveSync.HttpError', null, ['status']);
  exports.HttpError = HttpError;

  function nsResolver(prefix) {
    var baseUrl = 'http://schemas.microsoft.com/exchange/autodiscover/';
    var ns = {
      rq: baseUrl + 'mobilesync/requestschema/2006',
      ad: baseUrl + 'responseschema/2006',
      ms: baseUrl + 'mobilesync/responseschema/2006',
    };
    return ns[prefix] || null;
  }

  function Version(str) {
    var details = str.split('.').map(function(x) {
      return parseInt(x);
    });
    this.major = details[0], this.minor = details[1];
  }
  exports.Version = Version;
  Version.prototype = {
    eq: function(other) {
      if (!(other instanceof Version))
        other = new Version(other);
      return this.major === other.major && this.minor === other.minor;
    },
    ne: function(other) {
      return !this.eq(other);
    },
    gt: function(other) {
      if (!(other instanceof Version))
        other = new Version(other);
      return this.major > other.major ||
             (this.major === other.major && this.minor > other.minor);
    },
    gte: function(other) {
      if (!(other instanceof Version))
        other = new Version(other);
      return this.major >= other.major ||
             (this.major === other.major && this.minor >= other.minor);
    },
    lt: function(other) {
      return !this.gte(other);
    },
    lte: function(other) {
      return !this.gt(other);
    },
    toString: function() {
      return this.major + '.' + this.minor;
    },
  };

  /**
   * Set the Authorization header on an XMLHttpRequest.
   *
   * @param xhr the XMLHttpRequest
   * @param username the username
   * @param password the user's password
   */
  function setAuthHeader(xhr, username, password) {
    var authorization = 'Basic ' + btoa(username + ':' + password);
    xhr.setRequestHeader('Authorization', authorization);
  }

  /**
   * Perform autodiscovery for the server associated with this account.
   *
   * @param aEmailAddress the user's email address
   * @param aPassword the user's password
   * @param aTimeout a timeout (in milliseconds) for the request
   * @param aCallback a callback taking an error status (if any) and the
   *        server's configuration
   * @param aNoRedirect true if autodiscovery should *not* follow any
   *        specified redirects (typically used when autodiscover has already
   *        told us about a redirect)
   */
  function autodiscover(aEmailAddress, aPassword, aTimeout, aCallback,
                        aNoRedirect) {
    if (!aCallback) aCallback = nullCallback;
    var domain = aEmailAddress.substring(aEmailAddress.indexOf('@') + 1);

    // The first time we try autodiscovery, we should try to recover from
    // AutodiscoverDomainErrors and HttpErrors. The second time, *all* errors
    // should be reported to the callback.
    do_autodiscover(domain, aEmailAddress, aPassword, aTimeout, aNoRedirect,
                    function(aError, aConfig) {
      if (aError instanceof AutodiscoverDomainError ||
          aError instanceof HttpError)
        do_autodiscover('autodiscover.' + domain, aEmailAddress, aPassword,
                        aTimeout, aNoRedirect, aCallback);
      else
        aCallback(aError, aConfig);
    });
  }
  exports.autodiscover = autodiscover;

  /**
   * Perform the actual autodiscovery process for a given URL.
   *
   * @param aHost the host name to attempt autodiscovery for
   * @param aEmailAddress the user's email address
   * @param aPassword the user's password
   * @param aTimeout a timeout (in milliseconds) for the request
   * @param aNoRedirect true if autodiscovery should *not* follow any
   *        specified redirects (typically used when autodiscover has already
   *        told us about a redirect)
   * @param aCallback a callback taking an error status (if any) and the
   *        server's configuration
   */
  function do_autodiscover(aHost, aEmailAddress, aPassword, aTimeout,
                           aNoRedirect, aCallback) {
    var url = 'https://' + aHost + '/autodiscover/autodiscover.xml';
    return raw_autodiscover(url, aEmailAddress, aPassword, aTimeout,
                            aNoRedirect, aCallback);
  }

  function raw_autodiscover(aUrl, aEmailAddress, aPassword, aTimeout,
                            aNoRedirect, aCallback) {
    var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
    xhr.open('POST', aUrl, true);
    setAuthHeader(xhr, aEmailAddress, aPassword);
    xhr.setRequestHeader('Content-Type', 'text/xml');
    xhr.setRequestHeader('User-Agent', USER_AGENT);
    xhr.timeout = aTimeout;

    xhr.upload.onprogress = xhr.upload.onload = function() {
      xhr.timeout = 0;
    };

    xhr.onload = function() {
      if (xhr.status < 200 || xhr.status >= 300)
        return aCallback(new HttpError(xhr.statusText, xhr.status));

      var uid = Math.random();
      self.postMessage({
        uid: uid,
        type: 'configparser',
        cmd: 'accountactivesync',
        args: [xhr.responseText, aNoRedirect]
      });

      self.addEventListener('message', function onworkerresponse(evt) {
        var data = evt.data;
        if (data.type != 'configparser' || data.cmd != 'accountactivesync' ||
            data.uid != uid) {
          return;
        }
        self.removeEventListener(evt.type, onworkerresponse);

        var args = data.args;
        var config = args[0], error = args[1], redirectedEmail = args[2];
        if (error) {
          aCallback(new AutodiscoverDomainError(error), config);
        } else if (redirectedEmail) {
          autodiscover(redirectedEmail, aPassword, aTimeout, aCallback, true);
        } else {
          aCallback(null, config);
        }
      });
    };

    xhr.ontimeout = xhr.onerror = function() {
      // Something bad happened in the network layer, so treat this like an HTTP
      // error.
      aCallback(new HttpError('Error getting Autodiscover URL', null));
    };

    // TODO: use something like
    // http://ejohn.org/blog/javascript-micro-templating/ here?
    var postdata =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<Autodiscover xmlns="' + nsResolver('rq') + '">\n' +
    '  <Request>\n' +
    '    <EMailAddress>' + aEmailAddress + '</EMailAddress>\n' +
    '    <AcceptableResponseSchema>' + nsResolver('ms') +
         '</AcceptableResponseSchema>\n' +
    '  </Request>\n' +
    '</Autodiscover>';

    xhr.send(postdata);
  }
  exports.raw_autodiscover = raw_autodiscover;

  /**
   * Create a new ActiveSync connection.
   *
   * ActiveSync connections use XMLHttpRequests to communicate with the
   * server. These XHRs are created with mozSystem: true and mozAnon: true to,
   * respectively, help with CORS, and to ignore the authentication cache. The
   * latter is important because 1) it prevents the HTTP auth dialog from
   * appearing if the user's credentials are wrong and 2) it allows us to
   * connect to the same server as multiple users.
   *
   * @param aDeviceId (optional) a string identifying this device
   * @param aDeviceType (optional) a string identifying the type of this device
   */
  function Connection(aDeviceId, aDeviceType) {
    this._deviceId = aDeviceId || 'v140Device';
    this._deviceType = aDeviceType || 'SmartPhone';
    this.timeout = 0;

    this._connected = false;
    this._waitingForConnection = false;
    this._connectionError = null;
    this._connectionCallbacks = [];

    this.baseUrl = null;
    this._username = null;
    this._password = null;

    this.versions = [];
    this.supportedCommands = [];
    this.currentVersion = null;

    /**
     * Debug support function that is called every time an XHR call completes.
     * This is intended to be used for logging.
     *
     * The arguments to the function are:
     *
     * - type: 'options' if caused by a call to getOptions.  'post' if caused by
     *   a call to postCommand/postData.
     *
     * - special: 'timeout' if a timeout error occurred, 'redirect' if the
     *   status code was 451 and the call is being reissued, 'error' if some
     *   type of error occurred, or 'ok' on success.  Check xhr.status for the
     *   specific http status code.
     *
     * - xhr: The XMLHttpRequest used.  Use this to check the statusCode,
     *   statusText, or response headers.
     *
     * - params: The object dictionary of parameters encoded into the URL.
     *   Always present if type is 'post', not present for 'options'.
     *
     * - extraHeaders: Optional dictionary of extra request headers that were
     *   provided.  These will not include the always-present request headers of
     *   MS-ASProtocolVersion and Content-Type.
     *
     * - sent data: If type is 'post', the ArrayBuffer provided to xhr.send().
     *
     * - response: In the case of a successful 'post', the WBXML Reader instance
     *   that will be passed to the callback for the method.  If you use the
     *   reader, you are responsible for calling rewind() on it.
     */
    this.onmessage = null;
  }
  exports.Connection = Connection;
  Connection.prototype = {
    /**
     * Perform any callbacks added during the connection process.
     *
     * @param aError the error status (if any)
     */
    _notifyConnected: function(aError) {
      if (aError)
        this.disconnect();

      for (var iter in Iterator(this._connectionCallbacks)) {
        var callback = iter[1];
        callback.apply(callback, arguments);
      }
      this._connectionCallbacks = [];
    },

    /**
     * Get the connection status.
     *
     * @return true iff we are fully connected to the server
     */
    get connected() {
      return this._connected;
    },

    /*
     * Initialize the connection with a server and account credentials.
     *
     * @param aURL the ActiveSync URL to connect to
     * @param aUsername the account's username
     * @param aPassword the account's password
     */
    open: function(aURL, aUsername, aPassword) {
      // XXX: We add the default service path to the URL if it's not already
      // there. This is a hack to work around the failings of Hotmail (and
      // possibly other servers), which doesn't provide the service path in its
      // URL. If it turns out this causes issues with other domains, remove it.
      var servicePath = '/Microsoft-Server-ActiveSync';
      this.baseUrl = aURL;
      if (!this.baseUrl.endsWith(servicePath))
        this.baseUrl += servicePath;

      this._username = aUsername;
      this._password = aPassword;
    },

    /**
     * Connect to the server with this account by getting the OPTIONS from
     * the server (and verifying the account's credentials).
     *
     * @param aCallback a callback taking an error status (if any) and the
     *        server's options.
     */
    connect: function(aCallback) {
      // If we're already connected, just run the callback and return.
      if (this.connected) {
        if (aCallback)
          aCallback(null);
        return;
      }

      // Otherwise, queue this callback up to fire when we do connect.
      if (aCallback)
        this._connectionCallbacks.push(aCallback);

      // Don't do anything else if we're already trying to connect.
      if (this._waitingForConnection)
        return;

      this._waitingForConnection = true;
      this._connectionError = null;

      this.getOptions((function(aError, aOptions) {
        this._waitingForConnection = false;
        this._connectionError = aError;

        if (aError) {
          console.error('Error connecting to ActiveSync:', aError);
          return this._notifyConnected(aError, aOptions);
        }

        this._connected = true;
        this.versions = aOptions.versions;
        this.supportedCommands = aOptions.commands;
        this.currentVersion = new Version(aOptions.versions.slice(-1)[0]);

        return this._notifyConnected(null, aOptions);
      }).bind(this));
    },

    /**
     * Disconnect from the ActiveSync server, and reset the connection state.
     * The server and credentials remain set however, so you can safely call
     * connect() again immediately after.
     */
    disconnect: function() {
      if (this._waitingForConnection)
        throw new Error("Can't disconnect while waiting for server response");

      this._connected = false;
      this.versions = [];
      this.supportedCommands = [];
      this.currentVersion = null;
    },

    /**
     * Attempt to provision this account. XXX: Currently, this doesn't actually
     * do anything, but it's useful as a test command for Gmail to ensure that
     * the user entered their password correctly.
     *
     * @param aCallback a callback taking an error status (if any) and the
     *        WBXML response
     */
    provision: function(aCallback) {
      var pv = ASCP.Provision.Tags;
      var w = new WBXML.Writer('1.3', 1, 'UTF-8');
      w.stag(pv.Provision)
        .etag();
      this.postCommand(w, aCallback);
    },

    /**
     * Get the options for the server associated with this account.
     *
     * @param aCallback a callback taking an error status (if any), and the
     *        resulting options.
     */
    getOptions: function(aCallback) {
      if (!aCallback) aCallback = nullCallback;

      var conn = this;
      var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
      xhr.open('OPTIONS', this.baseUrl, true);
      setAuthHeader(xhr, this._username, this._password);
      xhr.setRequestHeader('User-Agent', USER_AGENT);
      xhr.timeout = this.timeout;

      xhr.upload.onprogress = xhr.upload.onload = function() {
        xhr.timeout = 0;
      };

      xhr.onload = function() {
        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync options request failed with response ' +
                        xhr.status);
          if (conn.onmessage)
            conn.onmessage('options', 'error', xhr, null, null, null, null);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        // These headers are comma-separated lists. Sometimes, people like to
        // put spaces after the commas, so make sure we trim whitespace too.
        var result = {
          versions: xhr.getResponseHeader('MS-ASProtocolVersions')
                       .split(/\s*,\s*/),
          commands: xhr.getResponseHeader('MS-ASProtocolCommands')
                       .split(/\s*,\s*/)
        };

        if (conn.onmessage)
          conn.onmessage('options', 'ok', xhr, null, null, null, result);
        aCallback(null, result);
      };

      xhr.ontimeout = xhr.onerror = function() {
        var error = new Error('Error getting OPTIONS URL');
        console.error(error);
        if (conn.onmessage)
          conn.onmessage('options', 'timeout', xhr, null, null, null, null);
        aCallback(error);
      };

      // Set the response type to "text" so that we don't try to parse an empty
      // body as XML.
      xhr.responseType = 'text';
      xhr.send();
    },

    /**
     * Check if the server supports a particular command. Requires that we be
     * connected to the server already.
     *
     * @param aCommand a string/tag representing the command type
     * @return true iff the command is supported
     */
    supportsCommand: function(aCommand) {
      if (!this.connected)
        throw new Error('Connection required to get command');

      if (typeof aCommand === 'number')
        aCommand = ASCP.__tagnames__[aCommand];
      return this.supportedCommands.indexOf(aCommand) !== -1;
    },

    /**
     * DEPRECATED. See postCommand() below.
     */
    doCommand: function() {
      console.warn('doCommand is deprecated. Use postCommand instead.');
      this.postCommand.apply(this, arguments);
    },

    /**
     * Send a WBXML command to the ActiveSync server and listen for the
     * response.
     *
     * @param aCommand {WBXML.Writer|String|Number}
     *   The WBXML representing the command or a string/tag representing the
     *   command type for empty commands
     * @param aCallback a callback to call when the server has responded; takes
     *        two arguments: an error status (if any) and the response as a
     *        WBXML reader. If the server returned an empty response, the
     *        response argument is null.
     * @param aExtraParams (optional) an object containing any extra URL
     *        parameters that should be added to the end of the request URL
     * @param aExtraHeaders (optional) an object containing any extra HTTP
     *        headers to send in the request
     * @param aProgressCallback (optional) a callback to invoke with progress
     *        information, when available. Two arguments are provided: the
     *        number of bytes received so far, and the total number of bytes
     *        expected (when known, 0 if unknown).
     */
    postCommand: function(aCommand, aCallback, aExtraParams, aExtraHeaders,
                          aProgressCallback) {
      var contentType = 'application/vnd.ms-sync.wbxml';

      if (typeof aCommand === 'string' || typeof aCommand === 'number') {
        this.postData(aCommand, contentType, null, aCallback, aExtraParams,
                      aExtraHeaders);
      }
      // WBXML.Writer
      else {
        var commandName = ASCP.__tagnames__[aCommand.rootTag];
        this.postData(
          commandName, contentType,
          aCommand.dataType === 'blob' ? aCommand.blob : aCommand.buffer,
          aCallback, aExtraParams, aExtraHeaders, aProgressCallback);
      }
    },

    /**
     * Send arbitrary data to the ActiveSync server and listen for the response.
     *
     * @param aCommand a string (or WBXML tag) representing the command type
     * @param aContentType the content type of the post data
     * @param aData {ArrayBuffer|Blob} the data to be posted
     * @param aCallback a callback to call when the server has responded; takes
     *        two arguments: an error status (if any) and the response as a
     *        WBXML reader. If the server returned an empty response, the
     *        response argument is null.
     * @param aExtraParams (optional) an object containing any extra URL
     *        parameters that should be added to the end of the request URL
     * @param aExtraHeaders (optional) an object containing any extra HTTP
     *        headers to send in the request
     * @param aProgressCallback (optional) a callback to invoke with progress
     *        information, when available. Two arguments are provided: the
     *        number of bytes received so far, and the total number of bytes
     *        expected (when known, 0 if unknown).
     */
    postData: function(aCommand, aContentType, aData, aCallback, aExtraParams,
                       aExtraHeaders, aProgressCallback) {
      // Make sure our command name is a string.
      if (typeof aCommand === 'number')
        aCommand = ASCP.__tagnames__[aCommand];

      if (!this.supportsCommand(aCommand)) {
        var error = new Error("This server doesn't support the command " +
                              aCommand);
        console.error(error);
        aCallback(error);
        return;
      }

      // Build the URL parameters.
      var params = [
        ['Cmd', aCommand],
        ['User', this._username],
        ['DeviceId', this._deviceId],
        ['DeviceType', this._deviceType]
      ];
      if (aExtraParams) {
        for (var iter in Iterator(params)) {
          var param = iter[1];
          if (param[0] in aExtraParams)
            throw new TypeError('reserved URL parameter found');
        }
        for (var kv in Iterator(aExtraParams))
          params.push(kv);
      }
      var paramsStr = params.map(function(i) {
        return encodeURIComponent(i[0]) + '=' + encodeURIComponent(i[1]);
      }).join('&');

      // Now it's time to make our request!
      var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
      xhr.open('POST', this.baseUrl + '?' + paramsStr, true);
      setAuthHeader(xhr, this._username, this._password);
      xhr.setRequestHeader('MS-ASProtocolVersion', this.currentVersion);
      xhr.setRequestHeader('Content-Type', aContentType);
      xhr.setRequestHeader('User-Agent', USER_AGENT);

      // Add extra headers if we have any.
      if (aExtraHeaders) {
        for (var iter in Iterator(aExtraHeaders)) {
          var key = iter[0], key = iter[1];
          xhr.setRequestHeader(key, value);
        }
      }

      xhr.timeout = this.timeout;

      xhr.upload.onprogress = xhr.upload.onload = function() {
        xhr.timeout = 0;
      };
      xhr.onprogress = function(event) {
        if (aProgressCallback)
          aProgressCallback(event.loaded, event.total);
      };

      var conn = this;
      var parentArgs = arguments;
      xhr.onload = function() {
        // This status code is a proprietary Microsoft extension used to
        // indicate a redirect, not to be confused with the draft-standard
        // "Unavailable For Legal Reasons" status. More info available here:
        // <http://msdn.microsoft.com/en-us/library/gg651019.aspx>
        if (xhr.status === 451) {
          conn.baseUrl = xhr.getResponseHeader('X-MS-Location');
          if (conn.onmessage)
            conn.onmessage(aCommand, 'redirect', xhr, params, aExtraHeaders,
                           aData, null);
          conn.postData.apply(conn, parentArgs);
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync command ' + aCommand + ' failed with ' +
                        'response ' + xhr.status);
          if (conn.onmessage)
            conn.onmessage(aCommand, 'error', xhr, params, aExtraHeaders,
                           aData, null);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        var response = null;
        if (xhr.response.byteLength > 0)
          response = new WBXML.Reader(new Uint8Array(xhr.response), ASCP);
        if (conn.onmessage)
          conn.onmessage(aCommand, 'ok', xhr, params, aExtraHeaders,
                         aData, response);
        aCallback(null, response);
      };

      xhr.ontimeout = xhr.onerror = function(evt) {
        var error = new Error('Command URL ' + evt.type + ' for command ' +
                              aCommand + ' at baseUrl ' + this.baseUrl);
        console.error(error);
        if (conn.onmessage)
          conn.onmessage(aCommand, evt.type, xhr, params, aExtraHeaders,
                         aData, null);
        aCallback(error);
      }.bind(this);

      xhr.responseType = 'arraybuffer';
      xhr.send(aData);
    },
  };

  return exports;
}));
