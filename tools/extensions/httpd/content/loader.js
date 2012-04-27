const CC = Components.Constructor;
const LocalFile = CC('@mozilla.org/file/local;1',
                     'nsILocalFile',
                     'initWithPath');
const ScriptableInputStream = CC(
  '@mozilla.org/scriptableinputstream;1',
  'nsIScriptableInputStream');

Components.utils.import('resource:///modules/devtools/dbg-client.jsm');

let debug = false;

function log(data) {
  if (!debug) {
    return;
  }
  dump(data);
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

  let host = '@GAIA_DOMAIN@';
  identity.add(scheme, host, port);

  let directories = getDirectories(baseDir);
  directories.forEach(function appendDir(name) {
    identity.add(scheme, name + '.' + host, port);
  });

  server.registerPathHandler('/marionette', handleMarionette);
}

function getDirectories(dir) {
  let appsDir = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(dir);
  appsDir.append('apps');

  let dirs = [];
  let files = appsDir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      dirs.push(file.leafName);
    }
  }
  return dirs;
}


function LongPoll(connid, transport) {
  this.transport = transport;
  this.connid = connid;
  this.buffer = [];
  this.outstanding_push = null;
  this.outstanding_noop = null;
  this.outstanding_timeout = null;
}

LongPoll.prototype = {
  cast: function cast(msg) {
    clearTimeout(this.outstanding_noop);
    this.buffer.push(msg);
    log('cast ' + JSON.stringify(msg) + ' ' + this.outstanding_push + '\n');
    if (this.outstanding_push !== null) {
      this.drain_queue(this.outstanding_push);
      this.outstanding_push.finish();
      this.outstanding_push = null;
      this.outstanding_timeout = setTimeout(function() {
        close(this.connid);
      }.bind(this), 5000);
    }
  },

  drain_queue: function drain_queue(res) {
    let queue = this.buffer,
        response = { messages: [] };

    this.buffer = [];

    queue.forEach(function(chunk) {
      if (chunk.noop) {
        return;
      }
      response.messages.push({
        id: this.connid,
        response: chunk
      });
    }.bind(this));

    res.write(JSON.stringify(response));
  },

  send: function send(obj) {
    this.transport.send(obj);
  }
};

let connections = {},
    transports = {},
    connection_num = 0,
    scriptable = new ScriptableInputStream();


function close(connid) {
  log('\n\n closing #' + connid + ' \n\n');
  let connection = connections[connid];
  connection.transport.close();
  delete connections[connid];
}


function handleMarionette(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.queryString.length === 0) {
        res.setStatusLine('1.1', 404, 'Not Found');
        res.write(JSON.stringify({
          error: 'connection not found'
        }));
      } else {
        // render event stream
        let connid = req.queryString.split('=')[0],
            connection = connections[connid];

        res.setStatusLine('1.1', 200, 'OK');
        res.setHeader('Content-Type', 'application/json');

        clearTimeout(connection.outstanding_timeout);

        if (connection.buffer.length === 0) {
          log('waiting /marionette?' + req.queryString + '\n');
          res.processAsync();
          connection.outstanding_push = res;
          log('\n\nsetting timeout\n\n');
          connection.outstanding_noop = setTimeout(function() {
            log('\n\nnoop\n\n');
            connection.cast({ noop: true });
          }, 25000);
        } else {
          log('messages /marionette?' + req.queryString + '\n');
          connection.drain_queue(res);
        }
      }
    } else if (req.method === 'POST') {
      // parse login screen
      // render connection stream
      let connid = connection_num++;

      res.setStatusLine('1.1', 200, 'OK');
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify({ id: connid}));

      req.bodyInputStream.asyncWait(function(stream) {
        scriptable.init(stream);
        let bytes = scriptable.read(scriptable.available()),
            parsed = JSON.parse(bytes);

        log('BYTES ' + bytes + '\n');
        let hostport = parsed.server + ':' + parsed.port;
        log('\n\ncheck\n\n');
        if (hostport in transports) {
          log('\n\nremove \n\n');
          close(transports[hostport]);
        }
        let transport,
            connection;

        transport = debuggerSocketConnect(parsed.server, parseInt(parsed.port));
        connection = new LongPoll(connid, transport);

        connections[connid] = connection;
        transports[hostport] = connid;

        transport.hooks = {
          onPacket: function onPacket(pack) {
            connection.cast(pack);
            log('ONPACKET' + JSON.stringify(pack) + '\n');
          },
          onClosed: function onClosed(status) {
            log('CLOSED' + JSON.stringify(status) + '\n');
          }
        };
        transport.ready();

        log('transport\n');

      }, 0, 0, Services.tm.currentThread);
    } else if (req.method === 'PUT') {
      let connid = req.queryString.split('=')[0],
          connection = connections[connid];
      log('put\n');
      res.setStatusLine('1.1', 201, 'Accepted');
      res.setHeader('Content-Type', 'text/plain', false);
      res.write('');
      req.bodyInputStream.asyncWait(function(stream) {
        scriptable.init(stream);
        let bytes = scriptable.read(scriptable.available()),
            parsed = null;
        try {
          parsed = JSON.parse(bytes);
          log('PARSED!\n');
        } catch (e) {
        }
        log('stream ' + bytes + '\n');
        connection.send(parsed);
      }, 0, 0, Services.tm.currentThread);
    } else if (req.method === 'DELETE') {
        let connid = req.queryString.split('=')[0];
        close(connid);
    } else {
      res.setStatusLine('1.1', 405, 'Method Not Allowed');
      res.write('');
    }
  } catch (e) {
    res.setStatusLine('1.1', 500, 'Internal Server Error');
    if (e.stack === undefined) {
      res.write(e.toString());
    } else {
      res.write(e.toString() + ' ' + e.stack);
    }
  }
}

startupHttpd('@GAIA_DIR@', @GAIA_PORT@);

