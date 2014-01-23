/**
 * Support for loading Thunderbird-derived IMAP, POP3 and SMTP
 * fake-servers as well as our ActiveSync fake-server. Thunderbird has
 * NNTP that we could steal too.
 *
 * Thunderbird's fake-servers are primarily used to being executed in an
 * xpcshell "global soup" type of context.  load(path) loads things in the
 * current (global) context a la the subscript loader.  (They've also been used
 * in TB's mozmill tests a little somehow.)  To this end, we create a sandbox
 * to load them in.
 *
 * These servers are intended to be used in one of three primary modes:
 * - In unit tests in the same process, such as our GELAM tests.  In this case,
 *   the unit test is in complete control of what folders are created.  Note
 *   that our unit tests run from a worker thread, but the fake-servers run in
 *   the main thread (with chrome privileges.)
 *
 * - In integration tests where the e-mail app is running in a b2g-desktop
 *   instance or on a real device and is being controlled by marionette.  In
 *   this case, we are expecting to be running inside an xpcwindow xpcshell
 *   instance and the test is in control of what folders are created.  In this
 *   case, the unit test is running with chrome privileges in the main thread,
 *   just like the fake servers.
 *
 * - As standalone servers initiated by GELAM's Makefile.  Eventually we will
 *   automatically put some messages in to make the accounts more interesting,
 *   but not yet.  The fake servers are run using our GELAM unit test harness.
 *
 * === Communication and control ===
 *
 * If our unit tests are running against a real IMAP/POP3 server, our
 * manipulation of the server must be asynchronous since we are
 * reusing the e-mail app's own implementation (like APPEND) and
 * there's no way we could do any evil tricks to make things seem
 * synchronous. This means that all of our test APIs for manipulating
 * servers are async.
 *
 * However, for our fake-servers, we can do things somewhat synchronously.
 *
 * For our unit tests, changes to the fake-servers are issued via synchronous
 * XHR requests to 'backdoor' JSON-over-HTTP servers from the worker thread
 * where the back-end and our unit tests run.  If run in the same thread, we
 * could bypass the HTTP thing.
 *
 *
 * === Overview of fake server files we use ===
 *
 * - maild.js: nsMailServer does all the network stuff, takes a handle-creator
 *   to invoke when a connection is received and a daemon to pass to it.
 *
 * - imapd.js: Provides the IMAP_RFC3501_handler which has all the
 *   per-connection state as well as the parsing logic and some odd stuff
 *   like the username and password.  The imapDaemon really just represents
 *   the (single user) account state in terms of mailboxes and their messages.
 *
 * - pop3d.js: The POP3_RFC5034_handler does everything.
 *
 * - smtpd.js: SMTP_RFC2821_handler does everything.  The daemon just
 *   accumulates a 'post' attribute when a message is sent.
 **/
var FakeServerSupport = (function(Components, inGELAM) {
try {
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var fu = {};
Cu.import('resource://gre/modules/FileUtils.jsm', fu);
// exposes HttpServer
Cu.import('resource://fakeserver/modules/httpd.js');
Cu.import('resource://gre/modules/NetUtil.jsm');


// -- create a sandbox
// We could use a scoped subscript load, but keeping the fake-servers in their
// own compartment makes it easier to track their memory usage and to kill
// them dead.  We could also use a JS module and subscript load into that.
var systemPrincipal = Cc["@mozilla.org/systemprincipal;1"]
                        .createInstance(Ci.nsIPrincipal);

function makeSandbox(name) {
  var sandbox = Cu.Sandbox(
    systemPrincipal,
    {
      sandboxName: name,
      // shouldn't matter because of the system principal?
      wantXrays: false,
      // yes, components!
      wantComponents: true,
      // don't care about XHR
      wantXHRConstructor: false
    });
  // provide some globals our subscripts love...
  sandbox.atob = atob
  sandbox.btoa = btoa;
  sandbox.TextEncoder = TextEncoder;
  sandbox.TextDecoder = TextDecoder;
  return sandbox;
}

/**
 * Simple wrapper around xhr to read files based on their path.
 * @private
 */
function synchronousReadFile(path) {
  // xhr wrapper can read from resource:// and this is less code then the
  // alternative methods... It probably is slow but its irrelevant for the small
  // load we have.
  var XHR = Components.Constructor('@mozilla.org/xmlextras/xmlhttprequest;1');
  var req = new XHR();
  req.open('GET', path, false);
  req.responseType = 'text';
  req.send();
  return req.responseText;
}

function loadInSandbox(base, relpath, sandbox) {
  var path = base.concat(relpath).join('/');
  var jsstr = synchronousReadFile(path);
  // the moz idiom is that synchronous file loading is okay for unit test
  // situations like this.  xpcshell load or even normal Cu.import would sync
  // load.
  Cu.evalInSandbox(jsstr, sandbox, '1.8', path);
}

var imapSandbox = null;
var baseFakeserver = ['resource:/', 'fakeserver'];
function createImapSandbox() {
  if (imapSandbox)
    return;

  imapSandbox = makeSandbox('imap-fakeserver');
  // all the fakeserver stuff
  loadInSandbox(baseFakeserver, ['subscript', 'maild.js'], imapSandbox);
  loadInSandbox(baseFakeserver, ['subscript', 'auth.js'], imapSandbox);
  loadInSandbox(baseFakeserver, ['subscript', 'imapd.js'], imapSandbox);
  loadInSandbox(baseFakeserver, ['subscript', 'pop3d.js'], imapSandbox);
  loadInSandbox(baseFakeserver, ['subscript', 'smtpd.js'], imapSandbox);
}

var activesyncSandbox = null;
var baseActiveSync = ['resource:/', 'activesync'];
var codepages = ['AirSyncBase.js', 'AirSync.js', 'Calendar.js', 'Common.js',
                 'ComposeMail.js', 'Contacts2.js', 'Contacts.js',
                 'DocumentLibrary.js', 'Email2.js', 'Email.js',
                 'FolderHierarchy.js', 'GAL.js', 'ItemEstimate.js',
                 'ItemOperations.js', 'MeetingResponse.js', 'Move.js',
                 'Notes.js', 'Ping.js', 'Provision.js', 'ResolveRecipients.js',
                 'RightsManagement.js', 'Search.js', 'Settings.js', 'Tasks.js',
                 'ValidateCert.js'];
function createActiveSyncSandbox() {
  if (activesyncSandbox)
    return;

  activesyncSandbox = makeSandbox('activesync-fakeserver');

  // load wbxml and all the codepages.
  if (inGELAM) {
    loadInSandbox(baseActiveSync, ['wbxml', 'wbxml.js'], activesyncSandbox);

    for (var i = 0; i < codepages.length; i++) {
      loadInSandbox(baseActiveSync, ['codepages', codepages[i]],
                    activesyncSandbox);
    }
    loadInSandbox(baseActiveSync, ['codepages.js'], activesyncSandbox);
  }
  else {
    throw new Error("XXX implement using aggregate JS file!");
  }

  // the actual activesync server logic
  loadInSandbox(baseFakeserver, ['subscript', 'activesync_server.js'],
                activesyncSandbox);
}

/**
 * Synchronously create a fake IMAP server operating on an available port.  The
 * IMAP server only services a single fake account.
 */
function makeIMAPServer(creds, opts) {
  createImapSandbox();

  var imapExtensions = (opts && opts.imapExtensions) || ['RFC2195'];

  var daemon = new imapSandbox.imapDaemon(0);
  daemon.kUsername = creds.username;
  daemon.kPassword = creds.password;

  function createHandler(d) {
    var handler = new imapSandbox.IMAP_RFC3501_handler(d);

    for (var i = 0; i < imapExtensions.length; i++) {
      var imapExt = imapExtensions[i];
      var mixinName = "IMAP_" + imapExt + "_extension";
      if (mixinName in imapSandbox)
        imapSandbox.mixinExtension(handler, imapSandbox[mixinName]);
    }
    return handler;
  }
  var server = new imapSandbox.nsMailServer(createHandler, daemon);
  // take an available port
  server.start(0);
  return {
    daemon: daemon,
    server: server,
    // create a handler that isn't talking to anything in order to let us do
    // IMAP protocol-ish things magicly/directly
    dummyHandler: createHandler(daemon),
    port: server._socket.port
  };
}

/**
 * Synchronously create a fake POP3 server operating on an available port.  The
 * POP3 server only services a single fake account.
 */
function makePOP3Server(creds, opts) {
    try { createImapSandbox(); } catch(e) { dump(e + e.stack)}
//  createImapSandbox();

  var daemon = new imapSandbox.pop3Daemon(0);
  daemon.kUsername = creds.username;
  daemon.kPassword = creds.password;

  function createHandler(d) {
    return new imapSandbox.POP3_RFC5034_handler(d);
  }
  var server = new imapSandbox.nsMailServer(createHandler, daemon);
  // take an available port
  server.start(0);
  return {
    daemon: daemon,
    server: server,
    // create a handler that isn't talking to anything in order to let us do
    // IMAP protocol-ish things magicly/directly
    dummyHandler: createHandler(daemon),
    port: server._socket.port
  };
}

function makeSMTPServer(receiveType, creds, daemon) {
  createImapSandbox();

  var smtpDaemon = new imapSandbox.smtpDaemon(function gotMessage(msgStr) {
    if (receiveType === 'imap') {
      var imapDaemon = daemon;
      imapDaemon.deliverMessage(msgStr);
    } else if (receiveType === 'pop3') {
      var pop3Daemon = daemon;
      pop3Daemon.setMessages(pop3Daemon._messages.concat([{fileData: msgStr}]));
    }
  });

  function createHandler(d) {
    var handler = new imapSandbox.SMTP_RFC2821_handler(d);

    handler.kUsername = creds.username;
    handler.kPassword = creds.password;

    return handler;
  }

  var server = new imapSandbox.nsMailServer(createHandler, smtpDaemon);
  // take an available port
  server.start(0);
  return {
    daemon: smtpDaemon,
    server: server,
    port: server._socket.port
  };
}

function makeActiveSyncServer(creds, logToDump) {
  createActiveSyncSandbox();
  var server = new activesyncSandbox.ActiveSyncServer({
    debug: false,
    creds: creds,
  });
  server.start(0);

  var httpServer = server.server;
  var port = httpServer._socket.port;
  httpServer._port = port;
  // it had created the identity on port 0, which is not helpful to anyone
  httpServer._identity._initialize(port, httpServer._host, true);

  if (logToDump) {
    server.logRequest = function(request, body) {
      let path = request.path;
      if (request.queryString)
        path += '?' + request.queryString;
      dump('\x1b[34m>>> ' + path + '\n');
      if (body) {
        if (body instanceof activesyncSandbox.WBXML.Reader) {
          dump(body.dump());
          body.rewind();
        }
        else {
          dump(JSON.stringify(body, null, 2) + '\n');
        }
      }
      dump('\x1b[0m\n');
    };

    server.logResponse = function(request, response, body) {
      dump('\x1b[34m<<<\n');
      if (body) {
        if (body instanceof activesyncSandbox.WBXML.Writer) {
          dump(new activesyncSandbox.WBXML.Reader(
                 body, activesyncSandbox.ActiveSyncCodepages).dump());
        }
        else {
          dump(JSON.stringify(body, null, 2) + '\n');
        }
      }
      dump('\x1b[0m\n');
    };

    server.logResponseError = function(err) {
      dump("ERR " + err + '\n\n');
    };
  }

  return {
    server: server,
    port: port
  };
}

////////////////////////////////////////////////////////////////////////////////
// Control server; spawns IMAP/POP3/SMTP/ActiveSync servers,
// manipulates IMAP/POP3
//
// It might make some sense for this to also be the means that we use to return
// test results some day.
//
// This class and/or its IMAP/POP3-specific bits could/should probably
// live in another file.

/**
 * Convert an nsIInputStream into a string.
 *
 * @param stream the nsIInputStream
 * @return the string
 */
function stringifyStream(stream) {
  if (!stream.available())
    return '';
  return NetUtil.readInputStreamToString(stream, stream.available());
}

/**
 * The control HTTP provides a JSON API to start/stop IMAP/POP3
 * servers as well as a JSON API to manipulate the state of those
 * servers in an out-of-band fashion.
 */
function ControlServer() {
  // maps IMAP port to an object with a coupled IMAP and SMTP server
  this.imapServerPairsByPort = Object.create(null);
  this.pop3ServerPairsByPort = Object.create(null);
  this.activeSyncServersByPort = Object.create(null);

  this._httpServer = new HttpServer();
  this._bindJsonHandler('/control', null, this._handleControl);

  this._httpServer.start(0);
  this.port = this._httpServer._port = this._httpServer._socket.port;
  // it had created the identity on port 0, which is not helpful to anyone
  this._httpServer._identity._initialize(
    this.port, this._httpServer._host, true);

  this.baseUrl = 'http://localhost:' + this.port;
}
ControlServer.prototype = {
  _bindJsonHandler: function(path, data, funcOnThis) {
    var self = this;
    this._httpServer.registerPathHandler(path, function(request, response) {
      try {
        var postData = JSON.parse(stringifyStream(request.bodyInputStream));
console.log('<---- request:::', postData.command);
        var responseData = funcOnThis.call(self, data, postData);
        response.setStatusLine('1.1', 200, 'OK');
console.log('----> responseData:::', responseData);
        if (responseData)
          response.write(JSON.stringify(responseData));
      }
      catch (ex) {
        console.error('Problem in control server for path', path, '-',
                      ex, '\n', ex.stack);
      }
    });

  },

  _handleControl: function(_unusedData, reqObj) {
    if (reqObj.command === 'make_imap_and_smtp') {
      // credentials should be { username, password }
      var imapServer = makeIMAPServer(reqObj.credentials, reqObj.options);
      var smtpServer = makeSMTPServer('imap',
                                      reqObj.credentials,
                                      imapServer.daemon);

      console.log('IMAP server started on port', imapServer.port);
      console.log('SMTP server started on port', smtpServer.port);

      var relPath = '/imap-' + imapServer.port;
      var pairInfo = this.imapServerPairsByPort[imapServer.port] = {
        relPath: relPath,
        imap: imapServer,
        smtp: smtpServer
      };

      this._bindJsonHandler(relPath, pairInfo, this._handleImapBackdoor);

      return {
        controlUrl: 'http://localhost:' + this.port + relPath,
        imapHost: 'localhost',
        imapPort: imapServer.port,
        smtpHost: 'localhost',
        smtpPort: smtpServer.port,
      };
    }
    else if (reqObj.command === 'make_pop3_and_smtp') {
      // credentials should be { username, password }
      var pop3Server = makePOP3Server(reqObj.credentials, reqObj.options);
      var smtpServer = makeSMTPServer('pop3',
                                      reqObj.credentials,
                                      pop3Server.daemon);

      console.log('POP3 server started on port', pop3Server.port);
      console.log('SMTP server started on port', smtpServer.port);

      var relPath = '/pop3-' + pop3Server.port;
      var pairInfo = this.pop3ServerPairsByPort[pop3Server.port] = {
        relPath: relPath,
        pop3: pop3Server,
        smtp: smtpServer
      };

      this._bindJsonHandler(relPath, pairInfo, this._handlePop3Backdoor);

      return {
        controlUrl: 'http://localhost:' + this.port + relPath,
        pop3Host: 'localhost',
        pop3Port: pop3Server.port,
        smtpHost: 'localhost',
        smtpPort: smtpServer.port,
      };
    }
    else if (reqObj.command === 'make_activesync') {
      var serverInfo = makeActiveSyncServer(reqObj.credentials,
                                            /* debug: log traffic */ false);
      this.activeSyncServersByPort[serverInfo.port] = serverInfo;
      return {
        // the control URL is also the ActiveSync server
        url: 'http://localhost:' + serverInfo.port,
      };
    }
    else {
      throw new Error('Unsupported command: ' + reqObj.command);
    }
  },

  _handleImapBackdoor: function(pairInfo, reqObj) {
    var imapDaemon = pairInfo.imap.daemon,
        imapHandler = pairInfo.imap.dummyHandler;
    var cmdFn = this['_imap_backdoor_' + reqObj.command] ||
                this['_unified_backdoor_' + reqObj.command];
    if (cmdFn) {
      return cmdFn(imapDaemon, reqObj, imapHandler);
    } else {
      return null;
    }
  },

  _handlePop3Backdoor: function(pairInfo, reqObj) {
    var pop3Daemon = pairInfo.pop3.daemon,
        pop3Handler = pairInfo.pop3.dummyHandler;
    var cmdFn = this['_pop3_backdoor_' + reqObj.command] ||
                this['_unified_backdoor_' + reqObj.command];
    if (cmdFn) {
      return cmdFn(pop3Daemon, reqObj, pop3Handler);
    } else {
      return null;
    }
  },

  _imap_backdoor_setDate: function(imapDaemon, req) {
    imapDaemon._useNowTimestamp = req.timestamp;
  },

  _imap_backdoor_getFolderByPath: function(imapDaemon, req) {
    var mailbox = imapDaemon.getMailbox(req.name);
    if (!mailbox)
      return null;
    return mailbox.name;
  },

  _imap_backdoor_addFolder: function(imapDaemon, req) {
    var success = imapDaemon.createMailbox(req.name);
    if (!success)
      return null;
    return req.name;
  },

  _imap_backdoor_removeFolder: function(imapDaemon, req) {
    var mailbox = imapDaemon.getMailbox(req.name);
    // For now it's a sign of an upstream logic bug to request that we remove a
    // folder that doesn't exist.
    if (!mailbox)
      return 'no-such-folder';
    imapDaemon.deleteMailbox(mailbox);
    return true;
  },

  _imap_backdoor_addMessagesToFolder: function(imapDaemon, req, imapHandler) {
    req.messages.forEach(function(msg) {
      try {
        // [folder name, flags array, Date, text]
        imapHandler.APPEND([req.name, msg.flags, new Date(msg.date),
                            msg.msgString]);
      }
      catch (ex) {
        console.error('IMAP fake-server APPEND error:', ex, '\n', ex.stack);
      }
    });
    // return the total number of messages in the folder now; this is a
    // debugging aid.
    var mailbox = imapDaemon.getMailbox(req.name);
    return mailbox._messages.length;
  },

  _imap_backdoor_modifyMessagesInFolder: function(imapDaemon, req,
                                                  imapHandler) {
    var uids = req.uids, addFlags = req.addFlags, delFlags = req.delFlags;
    var mailbox = imapDaemon.getMailbox(req.name);
    mailbox._messages.forEach(function(msg) {
      if (uids.indexOf(msg.uid) === -1)
        return;
      if (addFlags) {
        addFlags.forEach(function(flag) {
          msg.setFlag(flag);
        });
      }
      if (delFlags) {
        delFlags.forEach(function(flag) {
          msg.clearFlag(flag);
        });
      }
    });
  },

  _imap_backdoor_getMessagesInFolder: function(imapDaemon, req, imapHandler) {
    var mailbox = imapDaemon.getMailbox(req.name);
    var messages = mailbox._messages.map(function(imapMessage) {
      return {
        date: imapMessage.date,
        subject: imapMessage.getHeader('subject')
      };
    });
    return messages;
  },

  _unified_backdoor_changeCredentials: function(daemon, req, handler) {
    if (req.credentials.username)
      daemon.kUsername = req.credentials.username;
    if (req.credentials.password)
      daemon.kPassword = req.credentials.password;
  },

  _pop3_backdoor_getMessagesInFolder: function(pop3Daemon, req, pop3Handler) {
    var messages = pop3Daemon._messages.map(function(pop3Message) {
      return {
        date: pop3Message.parsed.date,
        subject: pop3Message.parsed.subject
      };
    });
    return messages;
  },

  _pop3_backdoor_addMessagesToFolder: function(pop3Daemon, req, pop3Handler) {
    var existingMessages = pop3Daemon._messages;
    pop3Daemon.setMessages(
      existingMessages.concat(req.messages).map(function(msg) {
        if (msg.fileData) {
          return msg;
        } else {
          return {fileData: msg.msgString};
        }
    }));
    // return the total number of messages in the folder now
    return pop3Daemon._messages.length;
  },

  killActiveServers: function() {
    var portStr;
    for (portStr in this.imapServerPairsByPort) {
      var servers = this.imapServerPairsByPort[portStr];
      try {
        servers.imap.server.stop();
      }
      catch (ex) {
        console.warn('Problem shutting down IMAP server on port',
                     servers.imap.port, '-', ex, '\n', ex.stack);
      }
      try {
        servers.smtp.server.stop();
      }
      catch (ex) {
        console.warn('Problem shutting down SMTP server on port',
                     servers.smtp.port, '-', ex, '\n', ex.stack);
      }
    }

    for (portStr in this.pop3ServerPairsByPort) {
      var servers = this.pop3ServerPairsByPort[portStr];
      try {
        servers.pop3.server.stop();
      }
      catch (ex) {
        console.warn('Problem shutting down POP3 server on port',
                     servers.pop3.port, '-', ex, '\n', ex.stack);
      }
      try {
        servers.smtp.server.stop();
      }
      catch (ex) {
        console.warn('Problem shutting down SMTP server on port',
                     servers.smtp.port, '-', ex, '\n', ex.stack);
      }
    }

    for (portStr in this.activeSyncServersByPort) {
      var info = this.activeSyncServersByPort[portStr];
      try {
        info.server.stop();
      }
      catch (ex) {
        console.warn('Problem shutting down ActiveSync server on port',
                     info.port, '-', ex, '\n', ex.stack);
      }
    }

    this.imapServerPairsByPort = Object.create(null);
    this.pop3ServerPairsByPort = Object.create(null);
    this.activeSyncServersByPort = Object.create(null);
  },

  /**
   * per-test cleanup function; does not shut down the control server itself.
   */
  cleanup: function() {
    this.killActiveServers();
  },

  /**
   * Shuts down the control server itself. The server is not very usable
   * after this.
   */
  shutdown: function() {
   this._httpServer.stop(function(){});
  }
};

/**
 * Make an HTTP server that can spawn IMAP servers and control the IMAP servers
 * that it spawns.
 */
function makeControlHttpServer() {
  var controlServer = new ControlServer();
  console.log('Control server started on port', controlServer.port);
  return {
    server: controlServer,
    port: controlServer.port
  };
}

////////////////////////////////////////////////////////////////////////////////

return {
  makeIMAPServer: makeIMAPServer,
  makePOP3Server: makePOP3Server,
  makeSMTPServer: makeSMTPServer,
  makeActiveSyncServer: makeActiveSyncServer,
  makeControlHttpServer: makeControlHttpServer,
};
} catch (ex) {
  console.error('Problem initializing FakeServerSupport', ex, '\n',
                ex.stack);
}
})((typeof window !== 'undefined' && window.xpcComponents) || Components,
   typeof window !== 'undefined' && window.xpcComponents ? false : true);
