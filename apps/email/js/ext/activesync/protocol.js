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
    define('activesync/protocol',['wbxml', 'activesync/codepages'], factory);
  else
    root.ActiveSyncProtocol = factory(WBXML, ActiveSyncCodepages);
}(this, function(WBXML, ASCP) {
  'use strict';

  var exports = {};

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
    const baseUrl = 'http://schemas.microsoft.com/exchange/autodiscover/';
    const ns = {
      rq: baseUrl + 'mobilesync/requestschema/2006',
      ad: baseUrl + 'responseschema/2006',
      ms: baseUrl + 'mobilesync/responseschema/2006',
    };
    return ns[prefix] || null;
  }

  function Version(str) {    [this.major, this.minor] = str.split('.').map(function(x) {
      return parseInt(x);
    });
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
    let authorization = 'Basic ' + btoa(username + ':' + password);
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
    let domain = aEmailAddress.substring(aEmailAddress.indexOf('@') + 1);

    // The first time we try autodiscovery, we should try to recover from
    // AutodiscoverDomainErrors. The second time, *all* errors should be
    // reported to the callback.
    do_autodiscover(domain, aEmailAddress, aPassword, aTimeout, aNoRedirect,
                    function(aError, aConfig) {
      if (aError instanceof AutodiscoverDomainError)
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
    let xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
    xhr.open('POST', 'https://' + aHost + '/autodiscover/autodiscover.xml',
             true);
    setAuthHeader(xhr, aEmailAddress, aPassword);
    xhr.setRequestHeader('Content-Type', 'text/xml');
    xhr.timeout = aTimeout;

    xhr.upload.onprogress = xhr.upload.onload = function() {
      xhr.timeout = 0;
    };

    xhr.onload = function() {
      if (xhr.status < 200 || xhr.status >= 300)
        return aCallback(new HttpError(xhr.statusText, xhr.status));

      let doc = new DOMParser().parseFromString(xhr.responseText, 'text/xml');

      function getNode(xpath, rel) {
        return doc.evaluate(xpath, rel, nsResolver,
                            XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                  .singleNodeValue;
      }
      function getNodes(xpath, rel) {
        return doc.evaluate(xpath, rel, nsResolver,
                            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      }
      function getString(xpath, rel) {
        return doc.evaluate(xpath, rel, nsResolver, XPathResult.STRING_TYPE,
                            null).stringValue;
      }

      if (doc.documentElement.tagName === 'parsererror')
        return aCallback(new AutodiscoverDomainError(
          'Error parsing autodiscover response'));

      let responseNode = getNode('/ad:Autodiscover/ms:Response', doc);
      if (!responseNode)
        return aCallback(new AutodiscoverDomainError(
          'Missing Autodiscover Response node'));

      let error = getNode('ms:Error', responseNode) ||
                  getNode('ms:Action/ms:Error', responseNode);
      if (error)
        return aCallback(new AutodiscoverError(
          getString('ms:Message/text()', error)));

      let redirect = getNode('ms:Action/ms:Redirect', responseNode);
      if (redirect) {
        if (aNoRedirect)
          return aCallback(new AutodiscoverError(
            'Multiple redirects occurred during autodiscovery'));

        let redirectedEmail = getString('text()', redirect);
        return autodiscover(redirectedEmail, aPassword, aTimeout, aCallback,
                            true);
      }

      let user = getNode('ms:User', responseNode);
      let config = {
        culture: getString('ms:Culture/text()', responseNode),
        user: {
          name:  getString('ms:DisplayName/text()',  user),
          email: getString('ms:EMailAddress/text()', user),
        },
        servers: [],
      };

      let servers = getNodes('ms:Action/ms:Settings/ms:Server', responseNode);
      let server;
      while ((server = servers.iterateNext())) {
        config.servers.push({
          type:       getString('ms:Type/text()',       server),
          url:        getString('ms:Url/text()',        server),
          name:       getString('ms:Name/text()',       server),
          serverData: getString('ms:ServerData/text()', server),
        });
      }

      // Try to find a MobileSync server from Autodiscovery.
      for (let [,server] in Iterator(config.servers)) {
        if (server.type === 'MobileSync') {
          config.mobileSyncServer = server;
          break;
        }
      }
      if (!config.mobileSyncServer) {
        return aCallback(new AutodiscoverError('No MobileSync server found'),
                         config);
      }

      aCallback(null, config);
    };

    xhr.ontimeout = xhr.onerror = function() {
      aCallback(new Error('Error getting Autodiscover URL'));
    };

    // TODO: use something like
    // http://ejohn.org/blog/javascript-micro-templating/ here?
    let postdata =
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

      for (let [,callback] in Iterator(this._connectionCallbacks))
        callback.apply(callback, arguments);
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
     * @param aServer the ActiveSync server to connect to
     * @param aUsername the account's username
     * @param aPassword the account's password
     */
    open: function(aServer, aUsername, aPassword) {
      this.baseUrl = aServer + '/Microsoft-Server-ActiveSync';
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
      const pv = ASCP.Provision.Tags;
      let w = new WBXML.Writer('1.3', 1, 'UTF-8');
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

      let conn = this;
      let xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
      xhr.open('OPTIONS', this.baseUrl, true);
      setAuthHeader(xhr, this._username, this._password);
      xhr.timeout = this.timeout;

      xhr.upload.onprogress = xhr.upload.onload = function() {
        xhr.timeout = 0;
      };

      xhr.onload = function() {
        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync options request failed with response ' +
                        xhr.status);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        let result = {
          versions: xhr.getResponseHeader('MS-ASProtocolVersions').split(','),
          commands: xhr.getResponseHeader('MS-ASProtocolCommands').split(','),
        };

        aCallback(null, result);
      };

      xhr.ontimeout = xhr.onerror = function() {
        let error = new Error('Error getting OPTIONS URL');
        console.error(error);
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
     * @param aCommand the WBXML representing the command or a string/tag
     *        representing the command type for empty commands
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
      const contentType = 'application/vnd.ms-sync.wbxml';

      if (typeof aCommand === 'string' || typeof aCommand === 'number') {
        this.postData(aCommand, contentType, null, aCallback, aExtraParams,
                      aExtraHeaders);
      }
      else {
        let r = new WBXML.Reader(aCommand, ASCP);
        let commandName = r.document.next().localTagName;
        this.postData(commandName, contentType, aCommand.buffer, aCallback,
                      aExtraParams, aExtraHeaders, aProgressCallback);
      }
    },

    /**
     * Send arbitrary data to the ActiveSync server and listen for the response.
     *
     * @param aCommand a string (or WBXML tag) representing the command type
     * @param aContentType the content type of the post data
     * @param aData the data to be posted
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
        let error = new Error("This server doesn't support the command " +
                              aCommand);
        console.error(error);
        aCallback(error);
        return;
      }

      // Build the URL parameters.
      let params = [
        ['Cmd', aCommand],
        ['User', this._email],
        ['DeviceId', this._deviceId],
        ['DeviceType', this._deviceType]
      ];
      if (aExtraParams) {
        for (let [,param] in Iterator(params)) {
          if (param[0] in aExtraParams)
            throw new TypeError('reserved URL parameter found');
        }
        for (let kv in Iterator(aExtraParams))
          params.push(kv);
      }
      let paramsStr = params.map(function(i) {
        return encodeURIComponent(i[0]) + '=' + encodeURIComponent(i[1]);
      }).join('&');

      // Now it's time to make our request!
      let xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
      xhr.open('POST', this.baseUrl + '?' + paramsStr, true);
      setAuthHeader(xhr, this._username, this._password);
      xhr.setRequestHeader('MS-ASProtocolVersion', this.currentVersion);
      xhr.setRequestHeader('Content-Type', aContentType);

      // Add extra headers if we have any.
      if (aExtraHeaders) {
        for (let [key, value] in Iterator(aExtraHeaders))
          xhr.setRequestHeader(key, value);
      }

      xhr.timeout = this.timeout;

      xhr.upload.onprogress = xhr.upload.onload = function() {
        xhr.timeout = 0;
      };
      xhr.onprogress = function(event) {
        if (aProgressCallback)
          aProgressCallback(event.loaded, event.total);
      };

      let conn = this;
      let parentArgs = arguments;
      xhr.onload = function() {
        // This status code is a proprietary Microsoft extension used to
        // indicate a redirect, not to be confused with the draft-standard
        // "Unavailable For Legal Reasons" status. More info available here:
        // <http://msdn.microsoft.com/en-us/library/gg651019.aspx>
        if (xhr.status === 451) {
          conn.baseUrl = xhr.getResponseHeader('X-MS-Location');
          conn.postData.apply(conn, parentArgs);
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync command ' + aCommand + ' failed with ' +
                        'response ' + xhr.status);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        let response = null;
        if (xhr.response.byteLength > 0)
          response = new WBXML.Reader(new Uint8Array(xhr.response), ASCP);
        aCallback(null, response);
      };

      xhr.ontimeout = xhr.onerror = function() {
        let error = new Error('Error getting command URL');
        console.error(error);
        aCallback(error);
      };

      xhr.responseType = 'arraybuffer';
      xhr.send(aData);
    },
  };

  return exports;
}));
