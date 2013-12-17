/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Much of the original code is taken from netwerk's httpserver implementation

Components.utils.import("resource://gre/modules/Services.jsm");

// Make sure we execute this file exactly once
var gMaild_js__;
if (!gMaild_js__) {
gMaild_js__ = true;

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var CC = Components.Constructor;

/** The XPCOM thread manager. */
var gThreadManager = null;

const fsDebugNone = 0;
const fsDebugRecv = 1;
const fsDebugRecvSend = 2;
const fsDebugAll = 3;

/**
 * JavaScript constructors for commonly-used classes; precreating these is a
 * speedup over doing the same from base principles.  See the docs at
 * http://developer.mozilla.org/en/Components.Constructor for details.
 */
const ServerSocket = CC("@mozilla.org/network/server-socket;1",
                        "nsIServerSocket",
                        "init");
const BinaryInputStream = CC("@mozilla.org/binaryinputstream;1",
                             "nsIBinaryInputStream",
                             "setInputStream");

// Time out after 3 minutes
const TIMEOUT = 3*60*1000;

/******************************************************************************
 * The main server handling class. A fake server consists of three parts, this
 * server implementation (which handles the network communication), the handler
 * (which handles the state for a connection), and the daemon (which handles
 * the state for the logical server). To make a new server, one needs to pass
 * in a function to create handlers--not the handlers themselves--and the
 * backend daemon. Since each handler presumably needs access to the logical
 * server daemon, that is passed into the handler creation function. A new
 * handler will be constructed for every connection made.
 *
 * As the core code is inherently single-threaded, it is guaranteed that all of
 * the calls to the daemon will be made on the same thread, so you do not have
 * to worry about reentrancy in daemon calls.  
 *
 ******************************************************************************
 * Typical usage:
 * function createHandler(daemon) {
 *   return new handler(daemon);
 * }
 * do_test_pending();
 * var server = new nsMailServer(createHandler, serverDaemon);
 * // Port to use. I tend to like using 1024 + default port number myself.
 * server.start(port);
 *
 * // Set up a connection the server...
 * server.performTest();
 * transaction = server.playTransaction();
 * // Verify that the transaction is correct...
 *
 * server.resetTest();
 * // Set up second test...
 * server.performTest();
 * transaction = server.playTransaction();
 *
 * // Finished with tests
 * server.stop();
 *
 * var thread = gThreadManager.currentThread;
 * while (thread.hasPendingEvents())
 *   thread.processNextEvent(true);
 *
 * do_test_finished();
 *****************************************************************************/
function nsMailServer(handlerCreator, daemon) {
  if (!gThreadManager)
    gThreadManager = Services.tm;

  this._debug = fsDebugNone;

  /** The port on which this server listens. */
  this._port = undefined;

  /** The socket associated with this. */
  this._socket = null;

  /**
   * True if the socket in this is closed (and closure notifications have been
   * sent and processed if the socket was ever opened), false otherwise.
   */
  this._socketClosed = true;

  /**
   * Should we log transactions?  This only matters if you want to inspect the
   * protocol traffic.  Defaults to true because this was written for protocol
   * testing.
   */
  this._logTransactions = true;

  this._handlerCreator = handlerCreator;
  this._daemon = daemon;
  this._readers = [];
  this._test = false;
  this._watchWord = undefined;

  /**
   * An array to hold refs to all the input streams below, so that they don't
   * get GCed
   */
  this._inputStreams = [];
}
nsMailServer.prototype = {
  onSocketAccepted : function (socket, trans) {
    if (this._debug != fsDebugNone)
      print("Received Connection from " + trans.host + ":" + trans.port);

    const SEGMENT_SIZE = 1024;
    const SEGMENT_COUNT = 1024;
    var input = trans.openInputStream(0, SEGMENT_SIZE, SEGMENT_COUNT)
                     .QueryInterface(Ci.nsIAsyncInputStream);
    this._inputStreams.push(input);

    var handler = this._handlerCreator(this._daemon);
    var reader = new nsMailReader(this, handler, trans, this._debug,
                                  this._logTransactions);
    this._readers.push(reader);

    // Note: must use main thread here, or we might get a GC that will cause
    //       threadsafety assertions.  We really need to fix XPConnect so that
    //       you can actually do things in multi-threaded JS.  :-(
    input.asyncWait(reader, 0, 0, gThreadManager.mainThread);
    this._test = true;
  },

  onStopListening : function (socket, status) {
    if (this._debug != fsDebugNone)
      print("Connection Lost " + status);

    this._socketClosed = true;
    // We've been killed or we've stopped, reset the handler to the original
    // state (e.g. to require authentication again).
    for (var i = 0; i < this._readers.length; i++) {
      this._readers[i]._handler.resetTest();
      this._readers[i]._realCloseSocket();
    }
  },

  setDebugLevel : function (debug) {
    this._debug = debug;
    for (var i = 0; i < this._readers.length; i++)
      this._readers[i].setDebugLevel(debug);
  },

  start : function (port) {
    if (this._socket)
      throw Cr.NS_ERROR_ALREADY_INITIALIZED;

    this._port = port;
    this._socketClosed = false;

    var socket = new ServerSocket(this._port,
                                  true, // loopback only
                                  -1);  // default number of pending connections

    socket.asyncListen(this);
    this._socket = socket;
  },

  stop : function () {
    if (!this._socket)
      return;

    this._socket.close();
    this._socket = null;

    for each (let reader in this._readers)
      reader._realCloseSocket();

    if (this._readers.some(function (e) { return e.observer.forced }))
      return;

    // spin an event loop and wait for the socket-close notification
    let thr = gThreadManager.currentThread;
    while (!this._socketClosed)
      // Don't wait for the next event, just in case there isn't one.
      thr.processNextEvent(false);
  },
  stopTest : function () {
    this._test = false;
  },

  // NSISUPPORTS

  //
  // see nsISupports.QueryInterface
  //
  QueryInterface : function (iid) {
    if (iid.equals(Ci.nsIServerSocketListener) ||
        iid.equals(Ci.nsISupports))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  },


  // NON-XPCOM PUBLIC API

  /**
   * Returns true if this server is not running (and is not in the process of
   * serving any requests still to be processed when the server was last
   * stopped after being run).
   */
  isStopped : function () {
    return this._socketClosed;
  },

  /**
   * Runs the test. It will not exit until the test has finished.
   */
  performTest : function (watchWord) {
    this._watchWord = watchWord;

    let thread = gThreadManager.currentThread;
    while (!this.isTestFinished())
      thread.processNextEvent(false);
  },

  /**
   * Returns true if the current processing test has finished.
   */
  isTestFinished : function() {
    return this._readers.length > 0 && !this._test;
  },

  /**
   * Returns the commands run between the server and client.
   * The return is an object with two variables (us and them), both of which
   * are arrays returning the commands given by each server.
   */
  playTransaction : function() {
    if (this._readers.some(function (e) { return e.observer.forced; }))
      throw "Server timed out!";
    if (this._readers.length == 1)
      return this._readers[0].transaction;
    else
      return this._readers.map(function (e) { return e.transaction; });
  },

  /**
   * Prepares for the next test.
   */
  resetTest : function() {
    this._readers = this._readers.filter(function (reader) {
      return reader._isRunning;
    });
    this._test = true;
    for (var i = 0; i < this._readers.length; i++)
      this._readers[i]._handler.resetTest();
  }
};

function readTo(input, count, arr) {
  var old = new BinaryInputStream(input).readByteArray(count);
  Array.prototype.push.apply(arr, old);
}

/******************************************************************************
 * The nsMailReader service, which reads and handles the lines.
 * All specific handling is passed off to the handler, which is responsible
 * for maintaining its own state. The following commands are required for the
 * handler object:
 * onError       Called when handler[command] does not exist with both the
 *               command and rest-of-line as arguments
 * onStartup     Called on initialization with no arguments
 * onMultiline   Called when in multiline with the entire line as an argument
 * postCommand   Called after every command with this reader as the argument
 * [command]     An untranslated command with the rest of the line as the
 *               argument. Defined as everything to the first space
 *
 * All functions, except onMultiline and postCommand, treat the
 * returned value as the text to be sent to the client; a newline at the end
 * may be added if it does not exist, and all lone newlines are converted to
 * CRLF sequences.
 *
 * The return of postCommand is ignored. The return of onMultiline is a bit
 * complicated: it may or may not return a response string (returning one is
 * necessary to trigger the postCommand handler).
 *
 * This object has the following supplemental functions for use by handlers:
 * closeSocket  Performs a server-side socket closing
 * setMultiline Sets the multiline mode based on the argument
 *****************************************************************************/
function nsMailReader(server, handler, transport, debug, logTransaction) {
  this._debug = debug;
  this._server = server;
  this._buffer = [];
  this._lines = [];
  this._handler = handler;
  this._transport = transport;
  var output = transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
  this._output = output;
  if (logTransaction)
    this.transaction = { us : [], them : [] };
  else
    this.transaction = null;

  // Send response line
  var response = this._handler.onStartup();
  response = response.replace(/([^\r])\n/g,"$1\r\n");
  if (!response.endsWith('\n'))
    response = response + "\r\n";
  if (this.transaction)
    this.transaction.us.push(response);
  this._output.write(response, response.length);
  this._output.flush();

  this._multiline = false;

  this._isRunning = true;
  
  this.observer = {
    server : server,
    forced : false,
    notify : function (timer) {
      this.forced = true;
      this.server.stopTest();
      this.server.stop();
    },
    QueryInterface : function (iid) {
      if (iid.equals(Ci.nsITimerCallback) || iid.equals(Ci.nsISupports))
        return this;

      throw Cr.NS_ERROR_NO_INTERFACE;
    }
  };
  this.timer = Cc["@mozilla.org/timer;1"].createInstance()
                                         .QueryInterface(Ci.nsITimer);
  this.timer.initWithCallback(this.observer, TIMEOUT,
                              Ci.nsITimer.TYPE_ONE_SHOT);
}
nsMailReader.prototype = {
  _findLines : function () {
    var buf = this._buffer;
    for (var crlfLoc = buf.indexOf(13); crlfLoc >= 0;
        crlfLoc = buf.indexOf(13, crlfLoc + 1)) {
      if (buf[crlfLoc + 1] == 10)
        break;
    }
    if (crlfLoc == -1)
      // We failed to find a newline
      return;

    var line = String.fromCharCode.apply(null, buf.slice(0, crlfLoc));
    this._buffer = buf.slice(crlfLoc + 2);
    this._lines.push(line);
    this._findLines();
  },

  onInputStreamReady : function (stream) {
    if (this.observer.forced)
      return;

    this.timer.cancel();
    try {
      var bytes = stream.available();
    } catch (e) {
      // Someone, not us, has closed the stream. This means we can't get any
      // more data from the stream, so we'll just go and close our socket.
      this._realCloseSocket();
      return;
    }
    readTo(stream, bytes, this._buffer);
    this._findLines();

    while (this._lines.length > 0) {
      var line = this._lines.shift();

      if (this._debug != fsDebugNone)
        print("RECV: " + line);

      var response;
      try {
        if (this._multiline) {
          response = this._handler.onMultiline(line);

          if (response === undefined)
            continue;
        } else {
          // Record the transaction
          if (this.transaction)
            this.transaction.them.push(line);

          // Find the command and splice it out...
          var splitter = line.indexOf(" ");
          var command = splitter == -1 ? line : line.substring(0,splitter);
          var args = splitter == -1 ? "" : line.substring(splitter+1);

          // By convention, commands are uppercase
          command = command.toUpperCase();

          if (this._debug == fsDebugAll)
            print("Received command " + command);

          if (command in this._handler)
            response = this._handler[command](args);
          else
            response = this._handler.onError(command, args);
        }

        this._preventLFMunge = false;
        this._handler.postCommand(this);

        if (this.watchWord && command == this.watchWord)
          this.stopTest();
      } catch (e) {
        response = this._handler.onServerFault(e);
        if (e instanceof Error) {
          dump(e.name + ": " + e.message + '\n');
          dump("File: " + e.fileName + " Line: " + e.lineNumber + '\n');
          dump('Stack trace:\n' + e.stack);
        } else {
          dump("Exception caught: " + e + '\n');
        }
      }

      if (!this._preventLFMunge)
        response = response.replace(/([^\r])\n/g,"$1\r\n");

      if (!response.endsWith('\n'))
       response = response + "\r\n";

      if (this._debug == fsDebugRecvSend) {
        print("SEND: " + response.split(" ", 1)[0]);
      }
      else if (this._debug == fsDebugAll) {
        var responses = response.split("\n");
        responses.forEach(function (line) { print("SEND: " + line); });
      }

      if (this.transaction)
        this.transaction.us.push(response);
      this._output.write(response, response.length);
      this._output.flush();

      if (this._signalStop) {
        this._realCloseSocket();
        this._signalStop = false;
      }
    }

    if (this._isRunning) {
      stream.asyncWait(this, 0, 0, gThreadManager.currentThread);
      this.timer.initWithCallback(this.observer, TIMEOUT,
                                  Ci.nsITimer.TYPE_ONE_SHOT);
    }
  },

  closeSocket : function () {
    this._signalStop = true;
  },
  _realCloseSocket : function () {
    this._isRunning = false;
    this._output.close();
    this._transport.close(Cr.NS_OK);
    this._server.stopTest();
  },

  setMultiline : function (multi) {
    this._multiline = multi;
  },

  setDebugLevel : function (debug) {
    this._debug = debug;
  },

  preventLFMunge : function () {
    this._preventLFMunge = true;
  },

  get watchWord () {
    return this._server._watchWord;
  },

  stopTest : function () {
    this._server.stopTest();
  },

  QueryInterface : function (iid) {
    if (iid.equals(Ci.nsIInputStreamCallback) ||
        iid.equals(Ci.nsISupports))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  }
};

/**
 * Creates a new fakeserver listening for loopback traffic on the given port,
 * starts it, runs the server until the server processes a shutdown request,
 * spinning an event loop so that events posted by the server's socket are
 * processed, and returns the server transaction log.
 *
 * This method is primarily intended for use in running this script manually
 * from within xpcshell and running a functional fakeserver without having to
 * deal with entire testing frameworks. For example, it could be connected to
 * from telnet or a non-testing version of mailnews for non-automated tests.
 * Actual testing code should abstain from using this method because the
 * server does not persist for multiple tests and it hogs the main thread when
 * called.
 *
 * Note that running multiple servers using variants of this method probably
 * doesn't work, simply due to how the internal event loop is spun and stopped.
 *
 * @param port
 *   the port on which the server will run, or -1 if there exists no preference
 *   for a specific port; note that attempting to use some values for this
 *   parameter (particularly those below 1024) may cause this method to throw or
 *   may result in the server being prematurely shut down
 * @param handler
 *   the handler (as defined in the documentation comment above nsMailReader) to
 *   use on the server
 * @param daemon
 *   the daemon (as defined in the documentation comment above nsMailReader) to
 *   use on the server
 */
function server(port, handler, daemon) {
  var srv = new nsMailServer(handler, daemon);
  srv.start(port);
  srv.performTest();
  return srv.playTransaction();
}

} // gMaild_js__
