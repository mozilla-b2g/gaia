
const CC = Components.Constructor;
const LocalFile = CC('@mozilla.org/file/local;1',
                     'nsILocalFile',
                     'initWithPath');
const ScriptableInputStream = CC(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream");

Components.utils.import('resource:///modules/devtools/dbg-client.jsm');


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

  try {
    Components.utils.import('resource:///modules/devtools/dbg-server.jsm');
  //  DebuggerServer.addBrowserActors();
    DebuggerServer.addActors('chrome://httpd.js/content/marionette-actors.js');
    DebuggerServer.init();
    DebuggerServer.openListener(2828, true);
  } catch (e) {
    // already open if running in b2g desktop
  }

  server.registerPathHandler('/marionette', handleMarionette);  
}

function getDirectories(dir) {
  let appsDir = Cc["@mozilla.org/file/local;1"]
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
}

LongPoll.prototype = {
  cast: function cast(msg) {
    this.buffer.push(msg);
    dump("cast "+JSON.stringify(msg)+ " " + this.outstanding_push + "\n");
    if (this.outstanding_push !== null) {
      this.drain_queue(this.outstanding_push);
      this.outstanding_push.finish();
      this.outstanding_push = null;
    }
  },

  drain_queue: function drain_queue(res) {
    let queue = this.buffer,
        nextid = this.connid + '=' + Date.now();

    this.buffer = [];

    queue.forEach(function(chunk) {
      res.write('msg('+JSON.stringify(chunk)+');\n');
    });

    res.write(
      'next("/marionette?' + nextid + '");\n');
  },

  send: function send(obj) {
    this.transport.send(obj);
  }
}


let connections = {},
    connection_num = 0,
    scriptable = new ScriptableInputStream();


function handleMarionette(req, res) {
  try {
    if (req.method === "GET") {
      if (req.queryString.length === 0) {
        dump("getlogin\n");
        // render login screen
        res.setStatusLine("1.1", 303, "See Other");
        res.setHeader("Location", "http://gaiamobile.org:8080/tools/marionette/");
        res.write('');
      } else {
        // render event stream
        let connid = req.queryString.split('=')[0],
            me = connections[connid];

        res.setStatusLine("1.1", 200, "OK");
        res.setHeader("Content-Type", "application/javascript");

        if (me.buffer.length === 0) {
          dump("waiting /marionette?" + req.queryString + "\n");
          res.processAsync();
          me.outstanding_push = res;
        } else {
          dump("messages /marionette?" + req.queryString + "\n");
          me.drain_queue(res);
        }
        //res.write('');
      }
    } else if (req.method === "POST") {
      // parse login screen
      // render connection stream
      let connid = connection_num++,
          ui_url = "http://gaiamobile.org:8080/tools/marionette/marionette.html?" + connid + '=' + Date.now();
 
      res.setStatusLine("1.1", 303, "See Other");
      res.setHeader("Location", ui_url);
      res.write('');
      req.bodyInputStream.asyncWait(function (stream) {
        scriptable.init(stream);
        let bytes = scriptable.read(scriptable.available()),
            parsed = {};
        dump("BYTES "+bytes+"\n");
        bytes.split('&').forEach(function(sub) {
          let spl = sub.split('=');
          parsed[spl[0]] = spl[1];
        });
        let transport = debuggerSocketConnect(parsed.server, parseInt(parsed.port)),
            me = new LongPoll(connid, transport);
  
        connections[connid] = me;
  
        transport.hooks = {
          onPacket: function onPacket(pack) {
            me.cast(pack);
            dump("ONPACKET"+JSON.stringify(pack)+"\n");
          },
          onClosed: function onClosed(status) {
            dump("CLOSED"+JSON.stringify(status)+"\n");
          }
        }
        transport.ready();
  //      client.request({'type': 'goUrl', 'value': 'http://zombo.com/'});
  
        dump("transport\n");
  
      }, 0, 0, Services.tm.currentThread);
    } else if (req.method === "PUT") {
      let connid = req.queryString.split('=')[0],
          me = connections[connid];
      dump("put\n");
      res.setStatusLine("1.1", 201, "Accepted");
      res.setHeader("Content-Type", "text/plain", false);
      res.write('');
      req.bodyInputStream.asyncWait(function (stream) {
        scriptable.init(stream);
        let bytes = scriptable.read(scriptable.available()),
            parsed = null;
        try {
          parsed = JSON.parse(bytes);
          dump("PARSED!\n");
        } catch (e) {
        }
        dump("stream " + bytes+"\n");
        me.send(parsed);
      }, 0, 0, Services.tm.currentThread);
    } else {
      res.setStatusLine("1.1", 405, "Method Not Allowed");
      res.write('');
    }
  } catch (e) {
    res.setStatusLine("1.1", 500, "Internal Server Error");
    if(e.stack === undefined) {
      res.write(e.toString());
    } else {
      res.write(e.toString() + " " + e.stack);
    }
  }
}

startupHttpd('@GAIA_DIR@', @GAIA_PORT@);

