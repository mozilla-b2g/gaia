/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup(data, reason) {
  const CC = Components.Constructor;
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  Cu.import('resource://gre/modules/Services.jsm');
  try {
    // Gecko < 21
    Cu.import('resource:///modules/devtools/dbg-client.jsm');
  } catch (e) {
    // Gecko >= 21
    Cu.import('resource://gre/modules/devtools/dbg-client.jsm');
  }

  // Make sure all applications are considered launchable
  Cu.import('resource://gre/modules/Webapps.jsm');
  DOMApplicationRegistry.allAppsLaunchable = true;

  const GAIA_DOMAIN = Services.prefs.getCharPref("extensions.gaia.domain");
  const GAIA_APPDIRS = Services.prefs.getCharPref("extensions.gaia.appdirs");
  const GAIA_DIR = Services.prefs.getCharPref("extensions.gaia.dir");
  const GAIA_PORT = Services.prefs.getIntPref("extensions.gaia.port");

  const LocalFile = CC('@mozilla.org/file/local;1',
                       'nsILocalFile',
                       'initWithPath');

  const ScriptableInputStream = CC('@mozilla.org/scriptableinputstream;1',
                                   'nsIScriptableInputStream',
                                   'init');

  let DEBUG = false;
  function debug(data) {
    if (!DEBUG)
      return;
    dump(data + '\n');
  }

  function startupHttpd(baseDir, port) {
    const httpdURL = 'chrome://httpd.js/content/httpd.js';
    let httpd = {};
    Services.scriptloader.loadSubScript(httpdURL, httpd);
    let server = new httpd.nsHttpServer();
    server.registerDirectory('/', new LocalFile(baseDir));
    server.registerContentType('appcache', 'text/cache-manifest');
    server.start(port);

    // Add {appname}.domain.tld:port to the list of domains handle by httpd
    let identity = server.identity;
    let scheme = 'http';

    let host = GAIA_DOMAIN;
    identity.add(scheme, host, port);

    let directories = getDirectories(GAIA_APPDIRS.split(' '));
    directories.forEach(function appendDir(name) {
      // Some app names can cause a raise here, preventing other apps
      // from being added.
      try {
        identity.add(scheme, name + '.' + host, port);
      } catch (e) {
        dump(e);
      }
    });

    server.registerPathHandler('/marionette', MarionetteHandler);
  }

  function getDirectories(appDirs) {
    return appDirs.map(function (path) {
      let appsDir = Cc['@mozilla.org/file/local;1']
                      .createInstance(Ci.nsILocalFile);
      appsDir.initWithPath(path);
      return appsDir.leafName;
    });
  }

  function LongPoll(connid, transport) {
    this.transport = transport;
    this.connid = connid;
    this.buffer = [];

    this.outstanding = {
      push: null,
      noop: null,
      timeout: null
    };
  }

  LongPoll.prototype = {
    cast: function cast(msg) {
      let outstanding = this.outstanding;
      clearTimeout(outstanding.noop);
      this.buffer.push(msg);

      if (outstanding.push === null)
        return;

      debug('cast ' + JSON.stringify(msg) + ' ' + outstanding.push);
      this.drain_queue(outstanding.push);
      outstanding.push.finish();
      outstanding.push = null;

      outstanding.timeout = setTimeout(function close(uid) {
        Connections.close(uid);
      }, 5000, this.connid);
    },

    drain_queue: function drain_queue(response) {
      let queue = this.buffer;
      this.buffer = [];

      let json = { 'messages': [] };
      queue.forEach(function(chunk) {
        if (chunk.noop) {
          //we need to send something to keep the client polling
          json.messages.push({});
          return;
        }
        json.messages.push({ 'id': this.connid, 'response': chunk });
      }.bind(this));

      response.write(JSON.stringify(json));
    },

    send: function send(obj) {
      this.transport.send(obj);
    }
  };

  let transports = {};

  function getUID() {
   return Cc['@mozilla.org/uuid-generator;1'].getService(Ci.nsIUUIDGenerator)
                                             .generateUUID()
                                             .toString();
  }

  var Connections = {
    _connections: {},
    close: function connections_close(uid) {
      if (uid in this._connections) {
        this._connections[uid].transport.close();
        delete this._connections[uid];
      }
    },

    add: function connections_add(uid, connection) {
      this._connections[uid] = connection;
    },

    get: function connections_get(uid) {
      return this._connections[uid] || null;
    }
  };

  var MarionetteHandler = {

    /**
     * Adding only test-agent for now.
     * In the future individual apps may need
     * access as well.
     */
    crosDomains: [
      'http://test-agent.gaiamobile.org',
      'http://test-agent.gaiamobile.org:8080',
      'http://test-agent.trunk.gaiamobile.org',
      'http://test-agent.trunk.gaiamobile.org:8080'
    ],

    // nsIHttpRequestHandler
    handle: function mh_handle(request, response) {
      try {
        this.handleCrosHeaders(request, response);

        switch (request.method) {
          case 'GET':
            this.onGet(request, response);
            break;
          case 'POST':
            this.onPost(request, response);
            break;
          case 'OPTIONS':
            this.onOptions(request, response);
            break;
          case 'PUT':
            this.onPut(request, response);
            break;
          case 'DELETE':
            this.onDelete(request, response);
            break;
          default:
            this.onDefault(request, response);
            break;
        }
      } catch (e) {
        response.setStatusLine('1.1', 500, 'Internal Server Error');
        response.write(e.toString() + e.stack == undefined ? '' : ' ' + e.stack);
      }
    },

    onOptions: function mh_options(request, response) {
      response.setStatusLine('1.1', 200, 'OK');
    },

    handleCrosHeaders: function mh_options(request, response) {
      if(!request.hasHeader('Origin'))
        return;

      let methods = 'GET, POST, PUT, DELETE, OPTIONS';
      let origin = request.getHeader('Origin');

      if (!origin || this.crosDomains.indexOf(origin) === -1) {
        return;
      }

      response.setHeader(
        'Access-Control-Allow-Origin',
        origin
      );

      response.setHeader(
        'Access-Control-Allow-Credentials',
        'true'
      );

      response.setHeader(
        'Access-Control-Max-Age',
        '2500'
      );

      response.setHeader(
        'Access-Control-Allow-Methods',
        methods
      );

      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, *');
    },

    onGet: function mh_get(request, response) {
      debug('/marionette?' + request.queryString);
      if (request.queryString.length === 0) {
        response.setStatusLine('1.1', 404, 'Not Found');
        response.write(JSON.stringify({ 'error': 'connection not found' }));
        return;
      }
      response.setStatusLine('1.1', 200, 'OK');
      response.setHeader('Content-Type', 'application/json');

      let uid = request.queryString.split('=')[0];
      let connection = Connections.get(uid);
      if (!connection) {
        debug('Could not get connection for ' + request.queryString);
        return;
      }

      clearTimeout(connection.outstanding.timeout);

      if (connection.buffer.length !== 0) {
        connection.drain_queue(response);
        return;
      }

      response.processAsync();

      connection.outstanding.push = response;
      connection.outstanding.noop = setTimeout(function() {
        debug('sending noop');
        connection.cast({ 'noop': true });
      }, 25000);
    },

    onPost: function mh_post(request, response) {
      response.setStatusLine('1.1', 200, 'OK');
      response.setHeader('Content-Type', 'application/json');

      let uid = getUID();
      response.write(JSON.stringify({ 'id': uid }));

      request.bodyInputStream.asyncWait(function(stream) {
        let scriptable = new ScriptableInputStream(stream);
        let json = scriptable.read(scriptable.available());
        let { server: server, port: port } = JSON.parse(json);

        let hostport = server + ':' + port;
        if (hostport in transports) {
          Connections.close(transports[hostport]);
        }

        debug('Opening a transport socket to the debugger...');
        let transport = debuggerSocketConnect(server, parseInt(port));
        let connection = new LongPoll(uid, transport);
        Connections.add(uid, connection);
        transports[hostport] = uid;

        transport.hooks = {
          onPacket: function onPacket(pack) {
            debug('onpacket ' + JSON.stringify(pack));
            connection.cast(pack);
          },
          onClosed: function onClosed(status) {
            debug('onclosed ' + JSON.stringify(status));
          }
        };

        transport.ready();
      }, 0, 0, Services.tm.currentThread);
    },

    onPut: function mh_put(request, response) {
      response.setStatusLine('1.1', 201, 'Accepted');
      response.setHeader('Content-Type', 'text/plain', false);
      response.write('');

      let uid = request.queryString.split('=')[0];
      let connection = Connections.get(uid);
      if (!connection) {
        debug('Could not get connection for ' + request.queryString);
        return;
      }

      request.bodyInputStream.asyncWait(function(stream) {
        let scriptable = new ScriptableInputStream(stream);
        let json = scriptable.read(scriptable.available());
        connection.send(JSON.parse(json));
      }, 0, 0, Services.tm.currentThread);
    },

    onDelete: function mh_delete(request, response) {
      Connections.close(request.queryString.split('=')[0]);
    },

    onDefault: function mh_default(request, response) {
      response.setStatusLine('1.1', 405, 'Method Not Allowed');
      response.write('');
    }
  };

  startupHttpd(GAIA_DIR, GAIA_PORT);
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}
