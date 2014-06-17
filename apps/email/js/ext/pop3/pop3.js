
/**
 * Remoted network API that tries to look like node.js's "net" API.  We are
 * expected/required to run in a worker thread where we don't have direct
 * access to mozTCPSocket so everything has to get remitted to the main thread.
 * Our counterpart is mailapi/worker-support/net-main.js
 *
 *
 * ## Sending lots of data: flow control, Blobs ##
 *
 * mozTCPSocket provides a flow-control mechanism (the return value to send
 * indicates whether we've crossed a buffering boundary and 'ondrain' tells us
 * when all buffered data has been sent), but does not yet support enqueueing
 * Blobs for processing (which is part of the proposed standard at
 * http://www.w3.org/2012/sysapps/raw-sockets/).  Also, the raw-sockets spec
 * calls for generating the 'drain' event once our buffered amount goes back
 * under the internal buffer target rather than waiting for it to hit zero like
 * mozTCPSocket.
 *
 * Our main desire right now for flow-control is to avoid using a lot of memory
 * and getting killed by the OOM-killer.  As such, flow control is not important
 * to us if we're just sending something that we're already keeping in memory.
 * The things that will kill us are giant things like attachments (or message
 * bodies we are quoting/repeating, potentially) that we are keeping as Blobs.
 *
 * As such, rather than echoing the flow-control mechanisms over to this worker
 * context, we just allow ourselves to write() a Blob and have the net-main.js
 * side take care of streaming the Blobs over the network.
 *
 * Note that successfully sending a lot of data may entail holding a wake-lock
 * to avoid having the network device we are using turned off in the middle of
 * our sending.  The network-connection abstraction is not currently directly
 * involved with the wake-lock management, but I could see it needing to beef up
 * its error inference in terms of timeouts/detecting disconnections so we can
 * avoid grabbing a wi-fi wake-lock, having our connection quietly die, and then
 * we keep holding the wi-fi wake-lock for much longer than we should.
 *
 * ## Supported API Surface ##
 *
 * We make sure to expose the following subset of the node.js API because we
 * have consumers that get upset if these do not exist:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events','mailapi/worker-router'],function(require, exports, module) {

function debug(str) {
  //dump("NetSocket: (" + Date.now() + ") :" + str + "\n");
}

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    router = require('mailapi/worker-router');

var routerMaker = router.registerInstanceType('netsocket');

function NetSocket(port, host, crypto) {
  var cmdMap = {
    onopen: this._onconnect.bind(this),
    onerror: this._onerror.bind(this),
    ondata: this._ondata.bind(this),
    onclose: this._onclose.bind(this)
  };
  var routerInfo = routerMaker.register(function(data) {
    cmdMap[data.cmd](data.args);
  });
  this._sendMessage = routerInfo.sendMessage;
  this._unregisterWithRouter = routerInfo.unregister;

  var args = [host, port,
              {
                // Bug 784816 is changing useSSL into useSecureTransport for
                // spec compliance.  Use both during the transition period.
                useSSL: crypto, useSecureTransport: crypto,
                binaryType: 'arraybuffer'
              }];
  this._sendMessage('open', args);

  EventEmitter.call(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
// The semantics of node.js's socket.write does not take ownership and that's
// how our code uses it, so we can't use transferrables by default.  However,
// there is an optimization we want to perform related to Uint8Array.subarray().
//
// All the subarray does is create a view on the underlying buffer.  This is
// important and notable because the structured clone implementation for typed
// arrays and array buffers is *not* clever; it just serializes the entire
// underlying buffer and the typed array as a view on that.  (This does have
// the upside that you can transfer a whole bunch of typed arrays and only one
// copy of the buffer.)  The good news is that ArrayBuffer.slice() does create
// an entirely new copy of the buffer, so that works with our semantics and we
// can use that to transfer only what needs to be transferred.
NetSocket.prototype.write = function(u8array) {
  if (u8array instanceof Blob) {
    // We always send blobs in their entirety; you should slice the blob and
    // give us that if that's what you want.
    this._sendMessage('write', [u8array]);
    return;
  }

  var sendArgs;
  // Slice the underlying buffer and transfer it if the array is a subarray
  if (u8array.byteOffset !== 0 ||
      u8array.length !== u8array.buffer.byteLength) {
    var buf = u8array.buffer.slice(u8array.byteOffset,
                                   u8array.byteOffset + u8array.length);
    this._sendMessage('write',
                      [buf, 0, buf.byteLength],
                      [buf]);
  }
  else {
    this._sendMessage('write',
                      [u8array.buffer, u8array.byteOffset, u8array.length]);
  }
};
NetSocket.prototype.upgradeToSecure = function() {
  this._sendMessage('upgradeToSecure', []);
};
NetSocket.prototype.end = function() {
  if (this.destroyed)
    return;
  this._sendMessage('end');
  this.destroyed = true;
  this._unregisterWithRouter();
};

NetSocket.prototype._onconnect = function() {
  this.emit('connect');
};
NetSocket.prototype._onerror = function(err) {
  this.emit('error', err);
};
NetSocket.prototype._ondata = function(data) {
  var buffer = Buffer(data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function() {
  this.emit('close');
  this.emit('end');
};

exports.connect = function(port, host, crypto) {
  return new NetSocket(port, host, !!crypto);
};

}); // end define
;
define('pop3/transport',['exports'], function(exports) {

  /**
   * This file contains the following classes:
   *
   * - Pop3Parser: Parses incoming POP3 requests
   * - Pop3Protocol: Uses the Pop3Parser to match requests up with responses
   * - Request: Encapsulates a request to the server
   * - Response: Encapsulates a response from the server
   *
   * The Pop3Client (in pop3.js) hooks together a socket and an
   * instance of Pop3Protocol to form a complete client. See pop3.js
   * for a more detailed description of the hierarchy.
   */

  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);

  var MAX_LINE_LENGTH = 512; // per POP3 spec, including CRLF
  var CR = '\r'.charCodeAt(0);
  var LF = '\n'.charCodeAt(0);
  var PERIOD = '.'.charCodeAt(0);
  var PLUS = '+'.charCodeAt(0);
  var MINUS = '-'.charCodeAt(0);
  var SPACE = ' '.charCodeAt(0);

  var textEncoder = new TextEncoder('utf-8', { fatal: false });
  var textDecoder = new TextDecoder('utf-8', { fatal: false });

  function concatBuffers(a, b) {
    var buffer = new Uint8Array(a.byteLength + b.byteLength);
    buffer.set(a, 0);
    buffer.set(b, a.byteLength);
    return buffer;
  }

  /**
   * Pop3Parser receives binary data (presumably from a socket) and
   * parse it according to the POP3 spec:
   *
   *   var parser = new Pop3Parser();
   *   parser.push(myBinaryData);
   *   var rsp = parser.extractResponse(false);
   *   if (rsp) {
   *     // do something with the response
   *   }
   */
  function Pop3Parser() {
    this.buffer = new Uint8Array(0); // data not yet parsed into lines
    this.unprocessedLines = [];
  }

  /**
   * Add new data to be parsed. To actually parse the incoming data
   * (to see if there is enough data to extract a full response), call
   * `.extractResponse()`.
   *
   * @param {Uint8Array} data
   */
  Pop3Parser.prototype.push = function(data) {
    // append the data to be processed
    var buffer = this.buffer = concatBuffers(this.buffer, data);

    // pull out full lines
    for (var i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === CR && buffer[i + 1] === LF) {
        var end = i + 1;
        if (end > MAX_LINE_LENGTH) {
          // Sadly, servers do this, so we can't bail here.
        }
        this.unprocessedLines.push(buffer.slice(0, end + 1));
        buffer = this.buffer = buffer.slice(end + 1);
        i = -1;
      }
    }
  }

  /**
   * Attempt to parse and return a single message from the buffered
   * data. Since the POP3 protocol does not provide a foolproof way to
   * determine whether a given message is multiline without tracking
   * request state, you must specify whether or not the response is
   * expected to be multiline.
   *
   * Multiple responses may be available; you should call
   * `.extractResponse()` repeatedly until no more responses are
   * available. This method returns null if there was not enough data
   * to parse and return a response.
   *
   * @param {boolean} multiline true to parse a multiline response.
   * @return {Response|null}
   */
  Pop3Parser.prototype.extractResponse = function(multiline) {
    if (!this.unprocessedLines.length) {
      return null;
    }
    if (this.unprocessedLines[0][0] !== PLUS) {
      multiline = false; // Negative responses are never multiline.
    }
    if (!multiline) {
      return new Response([this.unprocessedLines.shift()], false);
    } else {
      var endLineIndex = -1;
      for (var i = 1; i < this.unprocessedLines.length; i++) {
        var line = this.unprocessedLines[i];
        if (line.byteLength === 3 &&
            line[0] === PERIOD && line[1] === CR && line[2] === LF) {
          endLineIndex = i;
          break;
        }
      }
      if (endLineIndex === -1) {
        return null;
      }
      var lines = this.unprocessedLines.splice(0, endLineIndex + 1);
      lines.pop(); // remove final ".\r\n" line
      // the first line cannot be stuffed (it's the command OK/ERR
      // response). Other lines may be period-stuffed.
      for (var i = 1; i < endLineIndex; i++) {
        if (lines[i][0] === PERIOD) {
          lines[i] = lines[i].slice(1);
        }
      }
      return new Response(lines, true);
    }
  }

  /**
   * Represent a POP3 response (both success and failure). You should
   * not have to instantiate this class directly; Pop3Parser returns
   * these objects from `Pop3Parser.extractResponse()`.
   *
   * @param {UInt8Array[]} lines
   * @param {boolean} isMultiline
   */
  function Response(lines, isMultiline) {
    this.lines = lines; // list of UInt8Arrays
    this.isMultiline = isMultiline;
    this.ok = (this.lines[0][0] === PLUS);
    this.err = !this.ok;
    this.request = null;
  }

  /**
   * Return the description text for the status line as a string.
   */
  Response.prototype.getStatusLine = function() {
    return this.getLineAsString(0).replace(/^(\+OK|-ERR) /, '');
  }

  /**
   * Return the line at `index` as a string.
   *
   * @param {int} index
   * @return {String}
   */
  Response.prototype.getLineAsString = function(index) {
    return textDecoder.decode(this.lines[index]);
  }

  /**
   * Return an array of strings, one for each line, including CRLFs.
   * If you want to parse the data from a response, use
   * `.getDataLines()`.
   *
   * @return {String[]}
   */
  Response.prototype.getLinesAsString = function() {
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
      lines.push(this.getLineAsString(i));
    }
    return lines;
  }

  /**
   * Return an array of strings, _excluding_ CRLFs, starting from the
   * line after the +OK/-ERR line.
   */
  Response.prototype.getDataLines = function() {
    var lines = [];
    for (var i = 1; i < this.lines.length; i++) {
      var line = this.getLineAsString(i);
      lines.push(line.slice(0, line.length - 2)); // strip CRLF
    }
    return lines;
  }

  /**
   * Return the data portion of a multiline response as a string,
   * with the lines' CRLFs intact.
   */
  Response.prototype.getDataAsString = function() {
    var lines = [];
    for (var i = 1; i < this.lines.length; i++) {
      lines.push(this.getLineAsString(i));
    }
    return lines.join(''); // lines already have '\r\n'
  }

  /**
   * Return a string representation of the message, primarily for
   * debugging purposes.
   */
  Response.prototype.toString = function() {
    return this.getLinesAsString().join('\r\n');
  }

  /**
   * Represent a POP3 request, with enough data to allow the parser
   * to parse out a response and invoke a callback upon receiving a
   * response.
   *
   * @param {string} command The command, like RETR, USER, etc.
   * @param {string[]} args Arguments to the command, as an array.
   * @param {boolean} expectMultiline Whether or not the response will
   *                                  be multiline.
   * @param {function(err, rsp)} cb The callback to invoke when a
   *                                response is received.
   */
  function Request(command, args, expectMultiline, cb) {
    this.command = command;
    this.args = args;
    this.expectMultiline = expectMultiline;
    this.onresponse = cb || null;
  }

  exports.Request = Request;

  /**
   * Encode the request into a byte array suitable for transport over
   * a socket.
   */
  Request.prototype.toByteArray = function() {
    return textEncoder.encode(
      this.command + (this.args.length ? ' ' + this.args.join(' ') : '') + '\r\n');
  }

  /**
   * Trigger the response callback with '-ERR desc\r\n'.
   */
  Request.prototype._respondWithError = function(desc) {
    var rsp = new Response([textEncoder.encode(
      '-ERR ' + desc + '\r\n')], false);
    rsp.request = this;
    this.onresponse(rsp, null);
  }

  /**
   * Couple a POP3 parser with a request/response model, such that
   * you can easily hook Pop3Protocol up to a socket (or other
   * transport) to get proper request/response semantics.
   *
   * You must attach a handler to `.onsend`, which should fire data
   * across the wire. Similarly, you should call `.onreceive(data)` to
   * pass data back in from the socket.
   */
  function Pop3Protocol() {
    this.parser = new Pop3Parser();
    this.onsend = function(data) {
      throw new Error("You must implement Pop3Protocol.onsend to send data.");
    };
    this.unsentRequests = []; // if not pipelining, queue requests one at a time
    this.pipeline = false;
    this.pendingRequests = [];
    this.closed = false;
  }

  exports.Response = Response;
  exports.Pop3Protocol = Pop3Protocol;

  /**
   * Send a request to the server. Upon receiving a response, the
   * callback will be invoked, node-style, with an err or a response.
   * Negative replies (-ERR) are returned as an error to the callback;
   * positive replies (+OK) as a response. Socket errors are returned
   * as an error to the callback.
   *
   * @param {string} cmd The command like USER, RETR, etc.
   * @param {string[]} args An array of arguments to the command.
   * @param {boolean} expectMultiline Whether or not the response will
   *                                  be multiline.
   * @param {function(err, rsp)} cb The callback to invoke upon
   *                                receipt of a response.
   */
  Pop3Protocol.prototype.sendRequest = function(
    cmd, args, expectMultiline, cb) {
    var req;
    if (cmd instanceof Request) {
      req = cmd;
    } else {
      req = new Request(cmd, args, expectMultiline, cb);
    }

    if (this.closed) {
      req._respondWithError('(request sent after connection closed)');
      return;
    }

    if (this.pipeline || this.pendingRequests.length === 0) {
      this.onsend(req.toByteArray());
      this.pendingRequests.push(req);
    } else {
      this.unsentRequests.push(req);
    }
  }

  /**
   * Call this function to send received data to the parser. This
   * method automatically calls the appropriate response callback for
   * its respective request.
   */
  Pop3Protocol.prototype.onreceive = function(data) {
    this.parser.push(data);

    var response;
    while (true) {
      var req = this.pendingRequests[0];
      response = this.parser.extractResponse(req && req.expectMultiline);
      if (!response) {
        break;
      } else if (!req) {
        // It's unclear how to handle this in the most nondestructive way;
        // if we receive an unsolicited response, something has gone horribly
        // wrong, and it's unlikely that we'll be able to recover.
        console.error('Unsolicited response from server: ' + response);
        break;
      }
      response.request = req;
      this.pendingRequests.shift();
      if (this.unsentRequests.length) {
        this.sendRequest(this.unsentRequests.shift());
      }
      if (req.onresponse) {
        if (response.err) {
          req.onresponse(response, null);
        } else {
          req.onresponse(null, response);
        }
      }
    }
  }

  /**
   * Call this function when the socket attached to this protocol is
   * closed. Any current requests that have been enqueued but not yet
   * responded to will be sent a dummy "-ERR" response, indicating
   * that the underlying connection closed without actually
   * responding. This avoids the case where we hang if we never
   * receive a response from the server.
   */
  Pop3Protocol.prototype.onclose = function() {
    this.closed = true;
    var requestsToRespond = this.pendingRequests.concat(this.unsentRequests);
    this.pendingRequests = [];
    this.unsentRequests = [];
    for (var i = 0; i < requestsToRespond.length; i++) {
      var req = requestsToRespond[i];
      req._respondWithError('(connection closed, no response)');
    }
  }
});

define('mailparser/datetime',['require','exports','module'],function (require, exports, module) {
/* 
 * More info at: http://phpjs.org
 * 
 * This is version: 3.18
 * php.js is copyright 2010 Kevin van Zonneveld.
 * 
 * Portions copyright Brett Zamir (http://brett-zamir.me), Kevin van Zonneveld
 * (http://kevin.vanzonneveld.net), Onno Marsman, Theriault, Michael White
 * (http://getsprink.com), Waldo Malqui Silva, Paulo Freitas, Jonas Raoni
 * Soares Silva (http://www.jsfromhell.com), Jack, Philip Peterson, Ates Goral
 * (http://magnetiq.com), Legaev Andrey, Ratheous, Alex, Martijn Wieringa,
 * Nate, lmeyrick (https://sourceforge.net/projects/bcmath-js/), Philippe
 * Baumann, Enrique Gonzalez, Webtoolkit.info (http://www.webtoolkit.info/),
 * Ash Searle (http://hexmen.com/blog/), travc, Jani Hartikainen, Carlos R. L.
 * Rodrigues (http://www.jsfromhell.com), Ole Vrijenhoek, WebDevHobo
 * (http://webdevhobo.blogspot.com/), T.Wild,
 * http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript,
 * pilus, GeekFG (http://geekfg.blogspot.com), Rafał Kukawski
 * (http://blog.kukawski.pl), Johnny Mast (http://www.phpvrouwen.nl), Michael
 * Grier, Erkekjetter, d3x, marrtins, Andrea Giammarchi
 * (http://webreflection.blogspot.com), stag019, mdsjack
 * (http://www.mdsjack.bo.it), Chris, Steven Levithan
 * (http://blog.stevenlevithan.com), Arpad Ray (mailto:arpad@php.net), David,
 * Joris, Tim de Koning (http://www.kingsquare.nl), Marc Palau, Michael White,
 * Public Domain (http://www.json.org/json2.js), gettimeofday, felix, Aman
 * Gupta, Pellentesque Malesuada, Thunder.m, Tyler Akins (http://rumkin.com),
 * Karol Kowalski, Felix Geisendoerfer (http://www.debuggable.com/felix),
 * Alfonso Jimenez (http://www.alfonsojimenez.com), Diplom@t
 * (http://difane.com/), majak, Mirek Slugen, Mailfaker
 * (http://www.weedem.fr/), Breaking Par Consulting Inc
 * (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7),
 * Josh Fraser
 * (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/),
 * Martin (http://www.erlenwiese.de/), Paul Smith, KELAN, Robin, saulius, AJ,
 * Oleg Eremeev, Steve Hilder, gorthaur, Kankrelune
 * (http://www.webfaktory.info/), Caio Ariede (http://caioariede.com), Lars
 * Fischer, Sakimori, Imgen Tata (http://www.myipdf.com/), uestla, Artur
 * Tchernychev, Wagner B. Soares, Christoph, nord_ua, class_exists, Der Simon
 * (http://innerdom.sourceforge.net/), echo is bad, XoraX
 * (http://www.xorax.info), Ozh, Alan C, Taras Bogach, Brad Touesnard, MeEtc
 * (http://yass.meetcweb.com), Peter-Paul Koch
 * (http://www.quirksmode.org/js/beat.html), T0bsn, Tim Wiel, Bryan Elliott,
 * jpfle, JT, Thomas Beaucourt (http://www.webapp.fr), David Randall, Frank
 * Forte, Eugene Bulkin (http://doubleaw.com/), noname, kenneth, Hyam Singer
 * (http://www.impact-computing.com/), Marco, Raphael (Ao RUDLER), Ole
 * Vrijenhoek (http://www.nervous.nl/), David James, Steve Clay, Jason Wong
 * (http://carrot.org/), T. Wild, Paul, J A R, LH, strcasecmp, strcmp, JB,
 * Daniel Esteban, strftime, madipta, Valentina De Rosa, Marc Jansen,
 * Francesco, Stoyan Kyosev (http://www.svest.org/), metjay, Soren Hansen,
 * 0m3r, Sanjoy Roy, Shingo, sankai, sowberry, hitwork, Rob, Norman "zEh"
 * Fuchs, Subhasis Deb, josh, Yves Sucaet, Ulrich, Scott Baker, ejsanders,
 * Nick Callen, Steven Levithan (stevenlevithan.com), Aidan Lister
 * (http://aidanlister.com/), Philippe Jausions
 * (http://pear.php.net/user/jausions), Zahlii, Denny Wardhana, Oskar Larsson
 * Högfeldt (http://oskar-lh.name/), Brian Tafoya
 * (http://www.premasolutions.com/), johnrembo, Gilbert, duncan, Thiago Mata
 * (http://thiagomata.blog.com), Alexander Ermolaev
 * (http://snippets.dzone.com/user/AlexanderErmolaev), Linuxworld, lmeyrick
 * (https://sourceforge.net/projects/bcmath-js/this.), Jon Hohle, Pyerre,
 * merabi, Saulo Vallory, HKM, ChaosNo1, djmix, Lincoln Ramsay, Adam Wallner
 * (http://web2.bitbaro.hu/), paulo kuong, jmweb, Orlando, kilops, dptr1988,
 * DxGx, Pedro Tainha (http://www.pedrotainha.com), Bayron Guevara, Le Torbi,
 * James, Douglas Crockford (http://javascript.crockford.com), Devan
 * Penner-Woelk, Jay Klehr, Kheang Hok Chin (http://www.distantia.ca/), Luke
 * Smith (http://lucassmith.name), Rival, Amir Habibi
 * (http://www.residence-mixte.com/), Blues (http://tech.bluesmoon.info/), Ben
 * Bryan, booeyOH, Dreamer, Cagri Ekin, Diogo Resende, Howard Yeend, Pul,
 * 3D-GRAF, jakes, Yannoo, Luke Godfrey, daniel airton wermann
 * (http://wermann.com.br), Allan Jensen (http://www.winternet.no), Benjamin
 * Lupton, davook, Atli Þór, Maximusya, Leslie Hoare, Bug?, setcookie, YUI
 * Library: http://developer.yahoo.com/yui/docs/YAHOO.util.DateLocale.html,
 * Blues at http://hacks.bluesmoon.info/strftime/strftime.js, Andreas,
 * Michael, Christian Doebler, Gabriel Paderni, Marco van Oort, Philipp
 * Lenssen, Arnout Kazemier (http://www.3rd-Eden.com), penutbutterjelly, Anton
 * Ongson, DtTvB (http://dt.in.th/2008-09-16.string-length-in-bytes.html),
 * meo, Greenseed, Yen-Wei Liu, mk.keck, William, rem, Jamie Beck
 * (http://www.terabit.ca/), Russell Walker (http://www.nbill.co.uk/),
 * Garagoth, Dino, Andrej Pavlovic, gabriel paderni, FGFEmperor, Scott Cariss,
 * Slawomir Kaniecki, ReverseSyntax, Mateusz "loonquawl" Zalega, Francois,
 * Kirk Strobeck, Billy, vlado houba, Jalal Berrami, date, Itsacon
 * (http://www.itsacon.net/), Martin Pool, Pierre-Luc Paour, ger, john
 * (http://www.jd-tech.net), mktime, Simon Willison
 * (http://simonwillison.net), Nick Kolosov (http://sammy.ru), marc andreu,
 * Arno, Nathan, Kristof Coomans (SCK-CEN Belgian Nucleair Research Centre),
 * Fox, nobbler, stensi, Matteo, Riddler (http://www.frontierwebdev.com/),
 * Tomasz Wesolowski, T.J. Leahy, rezna, Eric Nagel, Alexander M Beedie, baris
 * ozdil, Greg Frazier, Bobby Drake, Ryan W Tenney (http://ryan.10e.us), Tod
 * Gentille, Rafał Kukawski, FremyCompany, Manish, Cord, fearphage
 * (http://http/my.opera.com/fearphage/), Victor, Brant Messenger
 * (http://www.brantmessenger.com/), Matt Bradley, Luis Salazar
 * (http://www.freaky-media.com/), Tim de Koning, taith, Rick Waldron, Mick@el
 * 
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */ 
this.strtotime = function(str, now) {
    // http://kevin.vanzonneveld.net
    // +   original by: Caio Ariede (http://caioariede.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: David
    // +   improved by: Caio Ariede (http://caioariede.com)
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Wagner B. Soares
    // +   bugfixed by: Artur Tchernychev
    // %        note 1: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
    // *     example 1: strtotime('+1 day', 1129633200);
    // *     returns 1: 1129719600
    // *     example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
    // *     returns 2: 1130425202
    // *     example 3: strtotime('last month', 1129633200);
    // *     returns 3: 1127041200
    // *     example 4: strtotime('2009-05-04 08:30:00');
    // *     returns 4: 1241418600
 
    var i, match, s, strTmp = '', parse = '';

    strTmp = str;
    strTmp = strTmp.replace(/\s{2,}|^\s|\s$/g, ' '); // unecessary spaces
    strTmp = strTmp.replace(/[\t\r\n]/g, ''); // unecessary chars

    if (strTmp == 'now') {
        return (new Date()).getTime()/1000; // Return seconds, not milli-seconds
    } else if (!isNaN(parse = Date.parse(strTmp))) {
        return (parse/1000);
    } else if (now) {
        now = new Date(now*1000); // Accept PHP-style seconds
    } else {
        now = new Date();
    }

    strTmp = strTmp.toLowerCase();

    var __is =
    {
        day:
        {
            'sun': 0,
            'mon': 1,
            'tue': 2,
            'wed': 3,
            'thu': 4,
            'fri': 5,
            'sat': 6
        },
        mon:
        {
            'jan': 0,
            'feb': 1,
            'mar': 2,
            'apr': 3,
            'may': 4,
            'jun': 5,
            'jul': 6,
            'aug': 7,
            'sep': 8,
            'oct': 9,
            'nov': 10,
            'dec': 11
        }
    };

    var process = function (m) {
        var ago = (m[2] && m[2] == 'ago');
        var num = (num = m[0] == 'last' ? -1 : 1) * (ago ? -1 : 1);

        switch (m[0]) {
            case 'last':
            case 'next':
                switch (m[1].substring(0, 3)) {
                    case 'yea':
                        now.setFullYear(now.getFullYear() + num);
                        break;
                    case 'mon':
                        now.setMonth(now.getMonth() + num);
                        break;
                    case 'wee':
                        now.setDate(now.getDate() + (num * 7));
                        break;
                    case 'day':
                        now.setDate(now.getDate() + num);
                        break;
                    case 'hou':
                        now.setHours(now.getHours() + num);
                        break;
                    case 'min':
                        now.setMinutes(now.getMinutes() + num);
                        break;
                    case 'sec':
                        now.setSeconds(now.getSeconds() + num);
                        break;
                    default:
                        var day;
                        if (typeof (day = __is.day[m[1].substring(0, 3)]) != 'undefined') {
                            var diff = day - now.getDay();
                            if (diff == 0) {
                                diff = 7 * num;
                            } else if (diff > 0) {
                                if (m[0] == 'last') {diff -= 7;}
                            } else {
                                if (m[0] == 'next') {diff += 7;}
                            }
                            now.setDate(now.getDate() + diff);
                        }
                }
                break;

            default:
                if (/\d+/.test(m[0])) {
                    num *= parseInt(m[0], 10);

                    switch (m[1].substring(0, 3)) {
                        case 'yea':
                            now.setFullYear(now.getFullYear() + num);
                            break;
                        case 'mon':
                            now.setMonth(now.getMonth() + num);
                            break;
                        case 'wee':
                            now.setDate(now.getDate() + (num * 7));
                            break;
                        case 'day':
                            now.setDate(now.getDate() + num);
                            break;
                        case 'hou':
                            now.setHours(now.getHours() + num);
                            break;
                        case 'min':
                            now.setMinutes(now.getMinutes() + num);
                            break;
                        case 'sec':
                            now.setSeconds(now.getSeconds() + num);
                            break;
                    }
                } else {
                    return false;
                }
                break;
        }
        return true;
    };

    match = strTmp.match(/^(\d{2,4}-\d{2}-\d{2})(?:\s(\d{1,2}:\d{2}(:\d{2})?)?(?:\.(\d+))?)?$/);
    if (match != null) {
        if (!match[2]) {
            match[2] = '00:00:00';
        } else if (!match[3]) {
            match[2] += ':00';
        }

        s = match[1].split(/-/g);

        for (i in __is.mon) {
            if (__is.mon[i] == s[1] - 1) {
                s[1] = i;
            }
        }
        s[0] = parseInt(s[0], 10);

        s[0] = (s[0] >= 0 && s[0] <= 69) ? '20'+(s[0] < 10 ? '0'+s[0] : s[0]+'') : (s[0] >= 70 && s[0] <= 99) ? '19'+s[0] : s[0]+'';
        return parseInt(this.strtotime(s[2] + ' ' + s[1] + ' ' + s[0] + ' ' + match[2])+(match[4] ? match[4]/1000 : ''), 10);
    }

    var regex = '([+-]?\\d+\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)'+
        '|(last|next)\\s'+
        '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?'+
        '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday'+
        '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))'+
        '(\\sago)?';

    match = strTmp.match(new RegExp(regex, 'gi')); // Brett: seems should be case insensitive per docs, so added 'i'
    if (match == null) {
        return false;
    }

    for (i = 0; i < match.length; i++) {
        if (!process(match[i].split(' '))) {
            return false;
        }
    }

    return (now.getTime()/1000);
}
});
define('mailparser/streams',['require','exports','module','stream','util','mimelib','encoding','crypto'],function (require, exports, module) {
var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    encodinglib = require('encoding'),
    crypto = require('crypto');

module.exports.Base64Stream = Base64Stream;
module.exports.QPStream = QPStream;
module.exports.BinaryStream = BinaryStream;

function Base64Stream(){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.current = "";
}
utillib.inherits(Base64Stream, Stream);

Base64Stream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

Base64Stream.prototype.end = function(data){
    this.handleInput(data);
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

Base64Stream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    
    var remainder = 0;
    this.current += data.replace(/[^\w\+\/=]/g,'');
    var buffer = new Buffer(this.current.substr(0, this.current.length - this.current.length % 4),"base64");
    if(buffer.length){
        this.length += buffer.length;
        this.checksum.update(buffer);
        this.emit("data", buffer);
    }
    this.current = (remainder=this.current.length % 4)?this.current.substr(- remainder):"";
};

function QPStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = undefined;
}
utillib.inherits(QPStream, Stream);

QPStream.prototype.write = function(data){
    this.handleInput(data);
    return true;
};

QPStream.prototype.end = function(data){
    this.handleInput(data);
    this.flush();
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

QPStream.prototype.handleInput = function(data){
    if(!data || !data.length){
        return;
    }
    
    data = (data || "").toString("utf-8");
    if(data.match(/^\r\n/)){
        data = data.substr(2);
    }
    
    if(typeof this.current !="string"){
        this.current = data;
    }else{
        this.current += "\r\n" + data;
    }
};

QPStream.prototype.flush = function(){
    var buffer = mimelib.decodeQuotedPrintable(this.current, false, this.charset);

    if(this.charset.toLowerCase() == "binary"){
        // do nothing
    }else if(this.charset.toLowerCase() != "utf-8"){
        buffer = encodinglib.convert(buffer, "utf-8", this.charset);
    }else{
        buffer = new Buffer(buffer, "utf-8");
    }

    this.length += buffer.length;
    this.checksum.update(buffer);
    
    this.emit("data", buffer);
};

function BinaryStream(charset){
    Stream.call(this);
    this.writable = true;
    
    this.checksum = crypto.createHash("md5");
    this.length = 0;
    
    this.charset = charset || "UTF-8";
    this.current = "";
}
utillib.inherits(BinaryStream, Stream);

BinaryStream.prototype.write = function(data){
    if(data && data.length){
        this.length += data.length;
        this.checksum.update(data);
        this.emit("data", data);
    }
    return true;
};

BinaryStream.prototype.end = function(data){
    if(data && data.length){
        this.emit("data", data);
    }
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};
});
define('mailparser/mailparser',['require','exports','module','stream','util','mimelib','./datetime','encoding','./streams','crypto'],function (require, exports, module) {

/**
 * @fileOverview This is the main file for the MailParser library to parse raw e-mail data
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 * @version 0.2.23
 */

var Stream = require('stream').Stream,
    utillib = require('util'),
    mimelib = require('mimelib'),
    datetime = require('./datetime'),
    encodinglib = require('encoding'),
    Streams = require('./streams'),
    crypto = require('crypto');

// Expose to the world
module.exports.MailParser = MailParser;

// MailParser is a FSM - it is always in one of the possible states
var STATES = {
    header:   0x1,
    body:     0x2,
    finished: 0x3
};

/**
 * <p>Creates instance of MailParser which in turn extends Stream</p>
 *
 * <p>Options object has the following properties:</p>
 *
 * <ul>
 *   <li><b>debug</b> - if set to true print all incoming lines to decodeq</li>
 *   <li><b>streamAttachments</b> - if set to true, stream attachments instead of including them</li>
 *   <li><b>unescapeSMTP</b> - if set to true replace double dots in the beginning of the file</li>
 *   <li><b>defaultCharset</b> - the default charset for text/plain, text/html content, if not set reverts to Latin-1
 *   <li><b>showAttachmentLinks</b></li> - if set to true, show inlined attachment links
 * </ul>
 *
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailParser(options){

    // Make MailParser a Stream object
    Stream.call(this);
    this.writable = true;

    /**
     * Options object
     * @public  */ this.options = options || {};

    /**
     * Indicates current state the parser is in
     * @private */ this._state         = STATES.header;

    /**
     * The remaining data from the previos chunk which is waiting to be processed
     * @private */ this._remainder     = "";

    /**
     * The complete tree structure of the e-mail
     * @public  */ this.mimeTree       = this._createMimeNode();

    /**
     * Current node of the multipart mime tree that is being processed
     * @private */ this._currentNode   = this.mimeTree;

    // default values for the root node
    this._currentNode.priority = "normal";

    /**
     * An object of already used attachment filenames
     * @private */ this._fileNames     = {};

    /**
     * An array of multipart nodes
     * @private */ this._multipartTree = [];


    /**
     * This is the final mail structure object that is returned to the client
     * @public  */ this.mailData       = {};

    /**
     * Line counter for debugging
     * @private */ this._lineCounter   = 0;

    /**
     * Did the last chunk end with \r
     * @private */ this._lineFeed      = false;

   /**
     * Is the "headers" event already emitted
     * @private */ this._headersSent   = false;
}
// inherit methods and properties of Stream
utillib.inherits(MailParser, Stream);

/**
 * <p>Writes a value to the MailParser stream<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true
 */
MailParser.prototype.write = function(chunk, encoding){
    if( this._write(chunk, encoding) ){
        process.nextTick(this._process.bind(this));
    }
    return true;
};

/**
 * <p>Terminates the MailParser stream</p>
 *
 * <p>If "chunk" is set, writes it to the Stream before terminating.</p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 */
MailParser.prototype.end = function(chunk, encoding){
    this._write(chunk, encoding);

    if(this.options.debug && this._remainder){
        console.log("REMAINDER: "+this._remainder);
    }

    process.nextTick(this._process.bind(this, true));
};

/**
 * <p>Normalizes CRLF's before writing to the Mailparser stream, does <i>not</i> call `_process`<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true if writing the chunk was successful
 */
MailParser.prototype._write = function(chunk, encoding){
    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, encoding);
    }

    chunk = chunk && chunk.toString("binary") || "";

    // if the last chunk ended with \r and this one begins
    // with \n, it's a split line ending. Since the last \r
    // was already used, skip the \n
    if(this._lineFeed && chunk.charAt(0) === "\n"){
        chunk = chunk.substr(1);
    }
    this._lineFeed = chunk.substr(-1) === "\r";

    if(chunk && chunk.length){
        this._remainder += chunk;
        return true;
    }
    return false;
};


/**
 * <p>Processes the data written to the MailParser stream</p>
 *
 * <p>The data is split into lines and each line is processed individually. Last
 * line in the batch is preserved as a remainder since it is probably not a
 * complete line but just the beginning of it. The remainder is later prepended
 * to the next batch of data.</p>
 *
 * @param {Boolean} [finalPart=false] if set to true indicates that this is the last part of the stream
 */
MailParser.prototype._process = function(finalPart){

    finalPart = !!finalPart;

    var lines = this._remainder.split(/\r?\n|\r/),
        line, i, len;

    if(!finalPart){
        this._remainder = lines.pop();
        // force line to 1MB chunks if needed
        if(this._remainder.length>1048576){
            this._remainder = this._remainder.replace(/(.{1048576}(?!\r?\n|\r))/g,"$&\n");
        }
    }

    for(i=0, len=lines.length; i < len; i++){
        line = lines[i];

        if(this.options.unescapeSMTP && line.substr(0,2)==".."){
            line = line.substr(1);
        }

        if(this.options.debug){
            console.log("LINE " + (++this._lineCounter) + " ("+this._state+"): "+line);
        }

        if(this._state == STATES.header){
            if(this._processStateHeader(line) === true){
                continue;
            }
        }

        if(this._state == STATES.body){

            if(this._processStateBody(line) === true){
                continue;
            }

        }
    }

    if(finalPart){
        if(this._state == STATES.header && this._remainder){
            this._processStateHeader(this._remainder);
            if(!this._headersSent){
                this.emit("headers", this._currentNode.parsedHeaders);
                this._headersSent = true;
            }
        }
        if(this._currentNode.content || this._currentNode.stream){
            this._finalizeContents();
        }
        this._state = STATES.finished;
        process.nextTick(this._processMimeTree.bind(this));
    }


};

/**
 * <p>Processes a line while in header state</p>
 *
 * <p>If header state ends and body starts, detect if the contents is an attachment
 * and create a stream for it if needed</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If state changes to body retuns true
 */
MailParser.prototype._processStateHeader = function(line){
    var boundary, i, len, attachment,
        lastPos = this._currentNode.headers.length - 1,
        textContent = false, extension;

    // Check if the header ends and body starts
    if(!line.length){
        if(lastPos>=0){
            this._processHeaderLine(lastPos);
        }
        if(!this._headersSent){
            this.emit("headers", this._currentNode.parsedHeaders);
            this._headersSent = true;
        }

        this._state = STATES.body;

        // if there's unprocessed header data, do it now
        if(lastPos >= 0){
            this._processHeaderLine(lastPos);
        }

        // this is a very simple e-mail, no content type set
        if(!this._currentNode.parentNode && !this._currentNode.meta.contentType){
            this._currentNode.meta.contentType = "text/plain";
        }

        textContent = ["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "") >= 0;

        // detect if this is an attachment or a text node (some agents use inline dispositions for text)
        if(textContent && (!this._currentNode.meta.contentDisposition || this._currentNode.meta.contentDisposition == "inline")){
            this._currentNode.attachment = false;
        }else if((!textContent || ["attachment", "inline"].indexOf(this._currentNode.meta.contentDisposition)>=0) &&
          !this._currentNode.meta.mimeMultipart){
            this._currentNode.attachment = true;
        }

        // handle attachment start
        if(this._currentNode.attachment){

            this._currentNode.checksum = crypto.createHash("md5");

            this._currentNode.meta.generatedFileName = this._generateFileName(this._currentNode.meta.fileName, this._currentNode.meta.contentType);

            extension = this._currentNode.meta.generatedFileName.split(".").pop().toLowerCase();

            // Update content-type if it's an application/octet-stream and file extension is available
            if(this._currentNode.meta.contentType == "application/octet-stream" && mimelib.contentTypes[extension]){
                this._currentNode.meta.contentType = mimelib.contentTypes[extension];
            }

            attachment = this._currentNode.meta;
            if(this.options.streamAttachments){
                if(this._currentNode.meta.transferEncoding == "base64"){
                    this._currentNode.stream = new Streams.Base64Stream();
                }else if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                    this._currentNode.stream = new Streams.QPStream("binary");
                }else{
                    this._currentNode.stream = new Streams.BinaryStream();
                }
                attachment.stream = this._currentNode.stream;

                this.emit("attachment", attachment);
            }else{
                this._currentNode.content = undefined;
            }
        }

        return true;
    }

    // unfold header lines if needed
    if(line.match(/^\s+/) && lastPos>=0){
        this._currentNode.headers[lastPos] += " " + line.trim();
    }else{
        this._currentNode.headers.push(line.trim());
        if(lastPos>=0){
            // if a complete header line is received, process it
            this._processHeaderLine(lastPos);
        }
    }

    return false;
};

/**
 * <p>Processes a line while in body state</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If body ends return true
 */
MailParser.prototype._processStateBody = function(line){
    var i, len, node,
        nodeReady = false;

    // Handle multipart boundaries
    if(line.substr(0, 2) == "--"){
        for(i=0, len = this._multipartTree.length; i<len; i++){

            // check if a new element block starts
            if(line == "--" + this._multipartTree[i].boundary){

                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }

                node = this._createMimeNode(this._multipartTree[i].node);
                this._multipartTree[i].node.childNodes.push(node);
                this._currentNode = node;
                this._state = STATES.header;
                nodeReady = true;
                break;
            }else
            // check if a multipart block ends
              if(line == "--" + this._multipartTree[i].boundary + "--"){

                if(this._currentNode.content || this._currentNode.stream){
                    this._finalizeContents();
                }

                if(this._multipartTree[i].node.parentNode){
                    this._currentNode = this._multipartTree[i].node.parentNode;
                }else{
                    this._currentNode = this._multipartTree[i].node;
                }
                this._state = STATES.body;
                nodeReady = true;
                break;
            }
        }
    }
    if(nodeReady){
        return true;
    }

    // handle text or attachment line
    if(["text/plain", "text/html"].indexOf(this._currentNode.meta.contentType || "")>=0 &&
      !this._currentNode.attachment){
        this._handleTextLine(line);
    }else if(this._currentNode.attachment){
        this._handleAttachmentLine(line);
    }

    return false;
};

/**
 * <p>Processes a complete unfolded header line</p>
 *
 * <p>Processes a line from current node headers array and replaces its value.
 * Input string is in the form of "X-Mailer: PHP" and its replacement would be
 * an object <code>{key: "x-mailer", value: "PHP"}</code></p>
 *
 * <p>Additionally node meta object will be filled also, for example with data from
 * To: From: Cc: etc fields.</p>
 *
 * @param {Number} pos Which header element (from an header lines array) should be processed
 */
MailParser.prototype._processHeaderLine = function(pos){
    var key, value, parts, line;

    pos = pos || 0;

    if(!(line = this._currentNode.headers[pos]) || typeof line != "string"){
        return;
    }

    parts = line.split(":");

    key = parts.shift().toLowerCase().trim();
    value = parts.join(":").trim();

    switch(key){
        case "content-type":
            this._parseContentType(value);
            break;
        case "mime-version":
            this._currentNode.useMIME = true;
            break;
        case "date":
            this._currentNode.meta.date = new Date(datetime.strtotime(value)*1000 || Date.now());
            break;
        case "to":
            if(this._currentNode.to && this._currentNode.to.length){
                this._currentNode.to = this._currentNode.to.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.to = mimelib.parseAddresses(value);
            }
            break;
        case "from":
            if(this._currentNode.from && this._currentNode.from.length){
                this._currentNode.from = this._currentNode.from.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.from = mimelib.parseAddresses(value);
            }
            break;
        case "cc":
            if(this._currentNode.cc && this._currentNode.cc.length){
                this._currentNode.cc = this._currentNode.cc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.cc = mimelib.parseAddresses(value);
            }
            break;
        case "bcc":
            if(this._currentNode.bcc && this._currentNode.bcc.length){
                this._currentNode.bcc = this._currentNode.bcc.concat(mimelib.parseAddresses(value));
            }else{
                this._currentNode.bcc = mimelib.parseAddresses(value);
            }
            break;
        case "x-priority":
        case "x-msmail-priority":
        case "importance":
            value = this._parsePriority(value);
            this._currentNode.priority = value;
            break;
        case "message-id":
            this._currentNode.meta.messageId = this._trimQuotes(value);
            break;
        case "references":
            this._parseReferences(value);
            break;
        case "in-reply-to":
            this._parseInReplyTo(value);
            break;
        case "thread-index":
            this._currentNode.meta.threadIndex = value;
            break;
        case "content-transfer-encoding":
            this._currentNode.meta.transferEncoding = value.toLowerCase();
            break;
        case "subject":
            this._currentNode.subject = this._encodeString(value);
            break;
        case "content-disposition":
            this._parseContentDisposition(value);
            break;
        case "content-id":
            this._currentNode.meta.contentId = this._trimQuotes(value);
            break;
    }

    if(this._currentNode.parsedHeaders[key]){
        if(!Array.isArray(this._currentNode.parsedHeaders[key])){
            this._currentNode.parsedHeaders[key] = [this._currentNode.parsedHeaders[key]];
        }
        this._currentNode.parsedHeaders[key].push(this._replaceMimeWords(value));
    }else{
        this._currentNode.parsedHeaders[key] = this._replaceMimeWords(value);
    }

    this._currentNode.headers[pos] = {key: key, value: value};
};

/**
 * <p>Creates an empty node element for the mime tree</p>
 *
 * <p>Created element includes parentNode property and a childNodes array. This is
 * needed to later walk the whole mime tree</p>
 *
 * @param {Object} [parentNode] the parent object for the created node
 * @returns {Object} node element for the mime tree
 */
MailParser.prototype._createMimeNode = function(parentNode){
    var node = {
        parentNode: parentNode || this._currentNode || null,
        headers: [],
        parsedHeaders:{},
        meta: {},
        childNodes: []
    };

    return node;
};

/**
 * <p>Splits a header value into key-value pairs</p>
 *
 * <p>Splits on <code>;</code> - the first value will be set as <code>defaultValue</code> property and will
 * not be handled, others will be split on <code>=</code> to key-value pairs</p>
 *
 * <p>For example <code>content-type: text/plain; charset=utf-8</code> will become:</p>
 *
 * <pre>
 * {
 *     defaultValue: "text/plain",
 *     charset: "utf-8"
 * }
 * </pre>
 *
 * @param {String} value A string to be splitted into key-value pairs
 * @returns {Object} a key-value object, with defaultvalue property
 */
MailParser.prototype._parseHeaderLineWithParams = function(value){
    var key, parts, returnValue = {};

    parts = value.split(";");
    returnValue.defaultValue = parts.shift().toLowerCase();

    for(var i=0, len = parts.length; i<len; i++){
        value = parts[i].split("=");
        key = value.shift().trim().toLowerCase();
        value = value.join("=").trim();

        // trim quotes
        value = this._trimQuotes(value);
        returnValue[key] = value;
    }

    return returnValue;
};

/**
 * <p>Parses a Content-Type header field value</p>
 *
 * <p>Fetches additional properties from the content type (charset etc.) and fills
 * current node meta object with this data</p>
 *
 * @param {String} value Content-Type string
 * @returns {Object} parsed contenttype object
 */
MailParser.prototype._parseContentType = function(value){
    var fileName;
    value = this._parseHeaderLineWithParams(value);
    if(value){
        if(value.defaultValue){
            value.defaultValue = value.defaultValue.toLowerCase();
            this._currentNode.meta.contentType = value.defaultValue;
            if(value.defaultValue.substr(0,"multipart/".length)=="multipart/"){
                this._currentNode.meta.mimeMultipart = value.defaultValue.substr("multipart/".length);
            }
        }else{
            this._currentNode.meta.contentType = "application/octet-stream";
        }
        if(value.charset){
            value.charset = value.charset.toLowerCase();
            if(value.charset.substr(0,4)=="win-"){
                value.charset = "windows-"+value.charset.substr(4);
            }else if(value.charset == "ks_c_5601-1987"){
                value.charset = "cp949";
            }else if(value.charset.match(/^utf\d/)){
                value.charset = "utf-"+value.charset.substr(3);
            }else if(value.charset.match(/^latin[\-_]?\d/)){
                value.charset = "iso-8859-"+value.charset.replace(/\D/g,"");
            }else if(value.charset.match(/^(us\-)?ascii$/)){
                value.charset = "utf-8";
            }
            this._currentNode.meta.charset = value.charset;
        }
        if(value.format){
            this._currentNode.meta.textFormat = value.format.toLowerCase();
        }
        if(value.delsp){
            this._currentNode.meta.textDelSp = value.delsp.toLowerCase();
        }
        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
        }

        if(!this._currentNode.meta.fileName && (fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }

        if(value.boundary){
            this._currentNode.meta.mimeBoundary = value.boundary;
            this._multipartTree.push({
                boundary: value.boundary,
                node: this._currentNode
            });
        }
    }
    return value;
};

/**
 * <p>Parses file name from a Content-Type or Content-Disposition field</p>
 *
 * <p>Supports <a href="http://tools.ietf.org/html/rfc2231">RFC2231</a> for
 * folded filenames</p>
 *
 * @param {Object} value Parsed Content-(Type|Disposition) object
 * @return {String} filename
 */
MailParser.prototype._detectFilename = function(value){
    var fileName="", i=0, parts, encoding, name;

    if(value.name){
        return this._replaceMimeWords(value.name);
    }

    if(value.filename){
        return this._replaceMimeWords(value.filename);
    }

    // RFC2231
    if(value["name*"]){
        fileName = value["name*"];
    }else if(value["filename*"]){
        fileName = value["filename*"];
    }else if(value["name*0*"]){
        while(value["name*"+(i)+"*"]){
            fileName += value["name*"+(i++)+"*"];
        }
    }else if(value["filename*0*"]){
        while(value["filename*"+(i)+"*"]){
            fileName += value["filename*"+(i++)+"*"];
        }
    }

    if(fileName){
        parts = fileName.split("'");
        encoding = parts.shift();
        name = parts.pop();
        if(name){
            return this._replaceMimeWords(this._replaceMimeWords("=?"+(encoding || "us-ascii")+"?Q?" + name.replace(/%/g,"=")+"?="));
        }
    }
    return "";
};

/**
 * <p>Parses Content-Disposition header field value</p>
 *
 * <p>Fetches filename to current node meta object</p>
 *
 * @param {String} value A Content-Disposition header field
 */
MailParser.prototype._parseContentDisposition = function(value){
    var returnValue = {},
        fileName;

    value = this._parseHeaderLineWithParams(value);

    if(value){
        if(value.defaultValue){
            this._currentNode.meta.contentDisposition = value.defaultValue.trim().toLowerCase();
        }
        if((fileName = this._detectFilename(value))){
            this._currentNode.meta.fileName = fileName;
        }
    }
};

/**
 * <p>Parses "References" header</p>
 *
 * @param {String} value References header field
 */
MailParser.prototype._parseReferences = function(value){
    this._currentNode.references = (this._currentNode.references || []).concat(
            (value || "").toString().
                trim().
                split(/\s+/).
                map(this._trimQuotes.bind(this))
        );
}

/**
 * <p>Parses "In-Reply-To" header</p>
 *
 * @param {String} value In-Reply-To header field
 */
MailParser.prototype._parseInReplyTo = function(value){
    this._currentNode.inReplyTo = (this._currentNode.inReplyTo || []).concat(
            (value || "").toString().
                trim().
                split(/\s+/).
                map(this._trimQuotes.bind(this))
        );
}

/**
 * <p>Parses the priority of the e-mail</p>
 *
 * @param {String} value The priority value
 * @returns {String} priority string low|normal|high
 */
MailParser.prototype._parsePriority = function(value){
    value = value.toLowerCase().trim();
    if(!isNaN(parseInt(value,10))){ // support "X-Priority: 1 (Highest)"
        value = parseInt(value, 10) || 0;
        if(value == 3){
            return "normal";
        }else if(value > 3){
            return "low";
        }else{
            return "high";
        }
    }else{
        switch(value){
            case "non-urgent":
            case "low":
                return "low";
            case "urgent":
            case "hight":
                return "high";
        }
    }
    return "normal";
};

/**
 * <p>Processes a line in text/html or text/plain node</p>
 *
 * <p>Append the line to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleTextLine = function(line){
    var encoding = this._currentNode.meta.transferEncoding;
    if(encoding === "base64"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line.trim();
        }else{
            this._currentNode.content += line.trim();
        }
    }
    else if(encoding === "quoted-printable" || this._currentNode.meta.textFormat != "flowed"){
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }else{
        if(typeof this._currentNode.content != "string"){
            this._currentNode.content = line;
        }else if(this._currentNode.content.match(/[ ]{1,}$/)){
            if(this._currentNode.meta.textDelSp == "yes"){
                this._currentNode.content = this._currentNode.content.replace(/\s+$/,"");
            }
            this._currentNode.content += line;
        }else{
            this._currentNode.content += "\n"+line;
        }
    }
};

/**
 * <p>Processes a line in an attachment node</p>
 *
 * <p>If a stream is set up for the attachment write the line to the
 * stream as a Buffer object, otherwise append it to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleAttachmentLine = function(line){
    if(!this._currentNode.attachment){
        return;
    }
    if(this._currentNode.stream){
        if(!this._currentNode.streamStarted){
            this._currentNode.streamStarted = true;
            this._currentNode.stream.write(new Buffer(line, "binary"));
        }else{
            this._currentNode.stream.write(new Buffer("\r\n"+line, "binary"));
        }
    }else if("content" in this._currentNode){
        if(typeof this._currentNode.content!="string"){
            this._currentNode.content = line;
        }else{
            this._currentNode.content += "\r\n" + line;
        }
    }
};

/**
 * <p>Finalizes a node processing</p>
 *
 * <p>If the node is a text/plain or text/html, convert it to UTF-8 encoded string
 * If it is an attachment, convert it to a Buffer or if an attachment stream is
 * set up, close the stream</p>
 */
MailParser.prototype._finalizeContents = function(){
    var streamInfo;

    if(this._currentNode.content){

        if(!this._currentNode.attachment){

            if(this._currentNode.meta.contentType == "text/html"){
                 this._currentNode.meta.charset = this._detectHTMLCharset(this._currentNode.content) || this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1";
            }

            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
              if (this._currentNode.meta.textFormat === "flowed") {
                if (this._currentNode.meta.textDelSp === "yes")
                  this._currentNode.content = this._currentNode.content.replace(/ \n/g, '');
                else
                  this._currentNode.content = this._currentNode.content.replace(/ \n/g, ' ');
                }
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = mimelib.decodeBase64(this._currentNode.content, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1");
            }else{
                this._currentNode.content = this._convertStringToUTF8(this._currentNode.content);
            }
        }else{
            if(this._currentNode.meta.transferEncoding == "quoted-printable"){
                this._currentNode.content = mimelib.decodeQuotedPrintable(this._currentNode.content, false, "binary");
            }else if(this._currentNode.meta.transferEncoding == "base64"){
                this._currentNode.content = new Buffer(this._currentNode.content.replace(/[^\w\+\/=]/g,''), "base64");
            }else{
                this._currentNode.content = new Buffer(this._currentNode.content, "binary");
            }
            this._currentNode.checksum.update(this._currentNode.content);
            this._currentNode.meta.checksum = this._currentNode.checksum.digest("hex");
            this._currentNode.meta.length = this._currentNode.content.length;
        }

    }

    if(this._currentNode.stream){
        streamInfo = this._currentNode.stream.end() || {};
        if(streamInfo.checksum){
            this._currentNode.meta.checksum = streamInfo.checksum;
        }
        if(streamInfo.length){
            this._currentNode.meta.length = streamInfo.length;
        }
    }
};

/**
 * <p>Processes the mime tree</p>
 *
 * <p>Finds text parts and attachments from the tree. If there's several text/plain
 * or text/html parts, push the ones from the lower parts of the tree to the
 * alternatives array</p>
 *
 * <p>Emits "end" when finished</p>
 */
MailParser.prototype._processMimeTree = function(){
    var level = 0, htmlLevel, textLevel,
        returnValue = {}, i, len;

    this.mailData = {html:[], text:[], alternatives:[], attachments:[]};

    if(!this.mimeTree.meta.mimeMultipart){
        this._processMimeNode(this.mimeTree, 0);
    }else{
        this._walkMimeTree(this.mimeTree);
    }

    if(this.mailData.html.length){
        for(i=0, len=this.mailData.html.length; i<len; i++){
            if(!returnValue.html || this.mailData.html[i].level < htmlLevel){
                if(returnValue.html){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/html",
                        content: returnValue.html
                    });
                }
                htmlLevel = this.mailData.html[i].level;
                returnValue.html = this.mailData.html[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/html",
                    content: this.mailData.html[i].content
                });
            }
        }
    }

    if(this.mailData.text.length){
        for(i=0, len=this.mailData.text.length; i<len; i++){
            if(!returnValue.text || this.mailData.text[i].level < textLevel){
                if(returnValue.text){
                    if(!returnValue.alternatives){
                        returnValue.alternatives = [];
                    }
                    returnValue.alternatives.push({
                        contentType: "text/plain",
                        content: returnValue.text
                    });
                }
                textLevel = this.mailData.text[i].level;
                returnValue.text = this.mailData.text[i].content;
            }else{
                if(!returnValue.alternatives){
                    returnValue.alternatives = [];
                }
                returnValue.alternatives.push({
                    contentType: "text/plain",
                    content: this.mailData.text[i].content
                });
            }
        }
    }

    returnValue.headers = this.mimeTree.parsedHeaders;

    if(this.mimeTree.subject){
        returnValue.subject = this.mimeTree.subject;
    }

    if(this.mimeTree.references){
        returnValue.references = this.mimeTree.references;
    }

    if(this.mimeTree.inReplyTo){
        returnValue.inReplyTo = this.mimeTree.inReplyTo;
    }

    if(this.mimeTree.priority){
        returnValue.priority = this.mimeTree.priority;
    }

    if(this.mimeTree.from){
        returnValue.from = this.mimeTree.from;
    }

    if(this.mimeTree.to){
        returnValue.to = this.mimeTree.to;
    }

    if(this.mimeTree.cc){
        returnValue.cc = this.mimeTree.cc;
    }

    if(this.mimeTree.bcc){
        returnValue.bcc = this.mimeTree.bcc;
    }

    if(this.mailData.attachments.length){
        returnValue.attachments = [];
        for(i=0, len=this.mailData.attachments.length; i<len; i++){
            returnValue.attachments.push(this.mailData.attachments[i].content);
        }
    }

    process.nextTick(this.emit.bind(this, "end", returnValue));
};

/**
 * <p>Walks the mime tree and runs processMimeNode on each node of the tree</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 */
MailParser.prototype._walkMimeTree = function(node, level){
    level = level || 1;
    for(var i=0, len = node.childNodes.length; i<len; i++){
        this._processMimeNode(node.childNodes[i], level, node.meta.mimeMultipart);
        this._walkMimeTree(node.childNodes[i], level+1);
    }
};

/**
 * <p>Processes of a node in the mime tree</p>
 *
 * <p>Pushes the node into appropriate <code>this.mailData</code> array (<code>text/html</code> to <code>this.mailData.html</code> array etc)</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 * @param {String} mimeMultipart Type of multipart we are dealing with (if any)
 */
MailParser.prototype._processMimeNode = function(node, level, mimeMultipart){
    var i, len;

    level = level || 0;

    if(!node.attachment){
        switch(node.meta.contentType){
            case "text/html":
                if(mimeMultipart == "mixed" && this.mailData.html.length){
                    for(i=0, len = this.mailData.html.length; i<len; i++){
                        if(this.mailData.html[i].level == level){
                            this._joinHTMLNodes(this.mailData.html[i], node.content);
                            return;
                        }
                    }
                }
                this.mailData.html.push({content: this._updateHTMLCharset(node.content || ""), level: level});
                return;
            case "text/plain":
                this.mailData.text.push({content: node.content || "", level: level});
                return;
        }
    }else{
        node.meta = node.meta || {};
        if(node.content){
            node.meta.content = node.content;
        }
        this.mailData.attachments.push({content: node.meta || {}, level: level});

        if(this.options.showAttachmentLinks && mimeMultipart == "mixed" && this.mailData.html.length){
            for(i=0, len = this.mailData.html.length; i<len; i++){
                if(this.mailData.html[i].level == level){
                    this._joinHTMLAttachment(this.mailData.html[i], node.meta);
                    return;
                }
            }
        }
    }
};

/**
 * <p>Joins two HTML blocks by removing the header of the added element<p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} newHTML HTML text to add to the original object node
 */
MailParser.prototype._joinHTMLNodes = function(htmlNode, newHTML){
    var inserted = false;

    // process new HTML
    newHTML = (newHTML || "").toString("utf-8").trim();

    // remove doctype from the beginning
    newHTML = newHTML.replace(/^\s*<\!doctype( [^>]*)?>/gi, "");

    // remove <head> and <html> blocks
    newHTML = newHTML.replace(/<head( [^>]*)?>(.*)<\/head( [^>]*)?>/gi, "").
                    replace(/<\/?html( [^>]*)?>/gi, "").
                    trim();

    // keep only text between <body> tags (if <body exists)
    newHTML.replace(/<body(?: [^>]*)?>(.*)<\/body( [^>]*)?>/gi, function(match, body){
        newHTML = body.trim();
    });

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Adds filename placeholder to the HTML if needed</p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} attachment Attachment meta object
 */
MailParser.prototype._joinHTMLAttachment = function(htmlNode, attachment){
    var inserted = false,
        fname = attachment.generatedFileName.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
        cid, newHTML;

    cid = attachment.cid || (attachment.cid = attachment.generatedFileName+"@node");
    newHTML = "\n<div class=\"mailparser-attachment\"><a href=\"cid:"+cid+"\">&lt;" + fname + "&gt;</a></div>";

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match){
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if(!inserted){
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Converts a string from one charset to another</p>
 *
 * @param {Buffer|String} value A String to be converted
 * @param {String} fromCharset source charset
 * @param {String} [toCharset="UTF-8"] destination charset
 * @returns {Buffer} Converted string as a Buffer (or SlowBuffer)
 */
MailParser.prototype._convertString = function(value, fromCharset, toCharset){
    toCharset = (toCharset || "utf-8").toUpperCase();
    fromCharset = (fromCharset || "utf-8").toUpperCase();

    value = typeof value=="string"?new Buffer(value, "binary"):value;

    if(toCharset == fromCharset){
        return value;
    }

    value = encodinglib.convert(value, toCharset, fromCharset);

    return value;
};

/**
 * <p>Converts a string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._convertStringToUTF8 = function(value){
    value = this._convertString(value, this._currentNode.meta.charset || this.options.defaultCharset || "iso-8859-1").toString("utf-8");
    return value;
};

/**
 * <p>Encodes a header string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._encodeString = function(value){
    value = this._replaceMimeWords(this._convertStringToUTF8(value));
    return value;
};

/**
 * <p>Replaces mime words in a string with UTF-8 encoded strings</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._replaceMimeWords = function(value){
    return value.
        replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]+\?=)/g, "$1"). // join mimeWords
        replace(/\=\?[^?]+\?[QqBb]\?[^?]+\?=/g, (function(a){
            return mimelib.decodeMimeWord(a.replace(/\s/g,''));
        }).bind(this));
};

/**
 * <p>Removes enclosing quotes ("", '', &lt;&gt;) from a string</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._trimQuotes = function(value){
    value = (value || "").trim();
    if((value.charAt(0)=='"' && value.charAt(value.length-1)=='"') ||
      (value.charAt(0)=="'" && value.charAt(value.length-1)=="'") ||
      (value.charAt(0)=="<" && value.charAt(value.length-1)==">")){
        value = value.substr(1,value.length-2);
    }
    return value;
};

/**
 * <p>Generates a context unique filename for an attachment</p>
 *
 * <p>If a filename already exists, append a number to it</p>
 *
 * <ul>
 *     <li>file.txt</li>
 *     <li>file-1.txt</li>
 *     <li>file-2.txt</li>
 * </ul>
 *
 * @param {String} fileName source filename
 * @param {String} contentType source content type
 * @returns {String} generated filename
 */
MailParser.prototype._generateFileName = function(fileName, contentType){
    var ext, defaultExt = "";

    if(contentType){
        defaultExt = mimelib.contentTypesReversed[contentType];
        defaultExt = defaultExt?"."+defaultExt:"";
    }

    fileName = fileName || "attachment"+defaultExt;

    // remove path if it is included in the filename
    fileName = fileName.toString().split(/[\/\\]+/).pop().replace(/^\.+/,"") || "attachment";

    if(fileName in this._fileNames){
        this._fileNames[fileName]++;
        ext = fileName.substr((fileName.lastIndexOf(".") || 0)+1);
        if(ext == fileName){
            fileName += "-" +  this._fileNames[fileName];
        }else{
            fileName = fileName.substr(0, fileName.length - ext.length - 1) + "-" + this._fileNames[fileName] + "." + ext;
        }
    }else{
        this._fileNames[fileName] = 0;
    }
    return fileName;
};


/**
 * <p>Replaces character set to UTF-8 in HTML &lt;meta&gt; tags</p>
 *
 * @param {String} HTML html contents
 * @returns {String} updated HTML
 */
MailParser.prototype._updateHTMLCharset = function(html){

    html = html.replace(/\n/g,"\u0000").
        replace(/<meta[^>]*>/gi, function(meta){
            if(meta.match(/http\-equiv\s*=\s*"?content\-type/i)){
                return '<meta http-equiv="content-type" content="text/html; charset=utf-8" />';
            }
            if(meta.match(/\scharset\s*=\s*['"]?[\w\-]+["'\s>\/]/i)){
                return '<meta charset="utf-8"/>';
            }
            return meta;
        }).
        replace(/\u0000/g,"\n");

    return html;
};

/**
 * <p>Detects the charset of an HTML file</p>
 *
 * @param {String} HTML html contents
 * @returns {String} Charset for the HTML
 */
MailParser.prototype._detectHTMLCharset = function(html){
    var charset, input, meta;

    if(typeof html !=" string"){
        html = html.toString("ascii");
    }

    if((meta = html.match(/<meta\s+http-equiv=["']content-type["'][^>]*?>/i))){
        input = meta[0];
    }

    if(input){
        charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
        if(charset){
            charset = (charset[1] || "").trim().toLowerCase();
        }
    }

    if(!charset && (meta = html.match(/<meta\s+charset=["']([^'"<\/]*?)["']/i))){
        charset = (meta[1] || "").trim().toLowerCase();
    }

    return charset;
};

});
/**
 *
 **/

define('mailapi/imap/imapchew',
  [
    'mimelib',
    'mailapi/db/mail_rep',
    '../mailchew',
    'exports'
  ],
  function(
    $mimelib,
    mailRep,
    $mailchew,
    exports
  ) {

function parseRfc2231CharsetEncoding(s) {
  // charset'lang'url-encoded-ish
  var match = /^([^']*)'([^']*)'(.+)$/.exec(s);
  if (match) {
    // we can convert the dumb encoding into quoted printable.
    return $mimelib.parseMimeWords(
      '=?' + (match[1] || 'us-ascii') + '?Q?' +
        match[3].replace(/%/g, '=') + '?=');
  }
  return null;
}

/**
 * Process the headers and bodystructure of a message to build preliminary state
 * and determine what body parts to fetch.  The list of body parts will be used
 * to issue another fetch request, and those results will be passed to
 * `chewBodyParts`.
 *
 * For now, our stop-gap heuristics for content bodies are:
 * - pick text/plain in multipart/alternative
 * - recurse into other multipart types looking for an alterntive that has
 *    text.
 * - do not recurse into message/rfc822
 * - ignore/fail-out messages that lack a text part, skipping to the next
 *    task.  (This should not happen once we support HTML, as there are cases
 *    where there are attachments without any body part.)
 * - Append text body parts together; there is no benefit in separating a
 *    mailing list footer from its content.
 *
 * For attachments, our heuristics are:
 * - only like them if they have filenames.  We will find this as "name" on
 *    the "content-type" or "filename" on the "content-disposition", quite
 *    possibly on both even.  For imap.js, "name" shows up in the "params"
 *    dict, and filename shows up in the "disposition" dict.
 * - ignore crypto signatures, even though they are named.  S/MIME gives us
 *    "smime.p7s" as an application/pkcs7-signature under a multipart/signed
 *    (that the server tells us is "signed").  PGP in MIME mode gives us
 *    application/pgp-signature "signature.asc" under a multipart/signed.
 *
 * The next step in the plan is to get an HTML sanitizer exposed so we can
 *  support text/html.  That will also imply grabbing multipart/related
 *  attachments.
 *
 * @typedef[ChewRep @dict[
 *   @key[bodyReps @listof[ImapJsPart]]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[relatedParts @listof[RelatedPartInfo]]
 * ]]
 * @return[ChewRep]
 */
function chewStructure(msg) {
  // imap.js builds a bodystructure tree using lists.  All nodes get wrapped
  //  in a list so they are element zero.  Children (which get wrapped in
  //  their own list) follow.
  //
  // Examples:
  //   text/plain =>
  //     [{text/plain}]
  //   multipart/alternative with plaintext and HTML =>
  //     [{alternative} [{text/plain}] [{text/html}]]
  //   multipart/mixed text w/attachment =>
  //     [{mixed} [{text/plain}] [{application/pdf}]]
  var attachments = [], bodyReps = [], unnamedPartCounter = 0,
      relatedParts = [];

  /**
   * Sizes are the size of the encoded string, not the decoded value.
   */
  function estimatePartSizeInBytes(partInfo) {
    var encoding = partInfo.encoding.toLowerCase();
    // Base64 encodes 3 bytes in 4 characters with padding that always
    // causes the encoding to take 4 characters.  The max encoded line length
    // (ignoring CRLF) is 76 bytes, with 72 bytes also fairly common.
    // As such, a 78=19*4+2 character line encodes 57=19*3 payload bytes and
    // we can use that as a rough estimate.
    if (encoding === 'base64') {
      return Math.floor(partInfo.size * 57 / 78);
    }
    // Quoted printable is hard to predict since only certain things need
    // to be encoded.  It could be perfectly efficient if the source text
    // has a bunch of newlines built-in.
    else if (encoding === 'quoted-printable') {
      // Let's just provide an upper-bound of perfectly efficient.
      return partInfo.size;
    }
    // No clue; upper bound.
    return partInfo.size;
  }

  function chewLeaf(branch, parentMultipartSubtype) {
    var partInfo = branch[0], i,
        filename, disposition;

    // - Detect named parts; they could be attachments
    // filename via content-type 'name' parameter
    if (partInfo.params && partInfo.params.name) {
      filename = $mimelib.parseMimeWords(partInfo.params.name);
    }
    // filename via content-type 'name' with charset/lang info
    else if (partInfo.params && partInfo.params['name*']) {
      filename = parseRfc2231CharsetEncoding(
                   partInfo.params['name*']);
    }
    // rfc 2231 stuff:
    // filename via content-disposition filename without charset/lang info
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params.filename) {
      filename = $mimelib.parseMimeWords(partInfo.disposition.params.filename);
    }
    // filename via content-disposition filename with charset/lang info
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params['filename*']) {
      filename = parseRfc2231CharsetEncoding(
                   partInfo.disposition.params['filename*']);
    }
    else {
      filename = null;
    }

    // Determining disposition:

    // First, check whether an explict one exists
    if (partInfo.disposition) {
      // If it exists, keep it the same, except in the case of inline
      // disposition without a content id.
      if (partInfo.disposition.type.toLowerCase() == 'inline') {
        if (partInfo.id) {
          disposition = 'inline';
        } else {
          disposition = 'attachment';
        }
      } else if (partInfo.disposition.type.toLowerCase() == 'attachment') {
        disposition = 'attachment';
      // This case should never trigger, but it's here for safety's sake
      } else {
        disposition = 'inline';
      }
    // Inline image attachments that belong to a multipart/related may lack a
    // disposition but have a content-id.
    // XXX Ensure 100% correctness in the future by fixing up mis-guesses
    // during sanitization as part of https://bugzil.la/1024685
    } else if (parentMultipartSubtype === 'related' && partInfo.id &&
               partInfo.type === 'image') {
      disposition = "inline";
    } else if (filename || partInfo.type !== 'text') {
      disposition = 'attachment';
    } else {
      disposition = 'inline';
    }

    // Some clients want us to display things inline that we simply can't
    // display (historically and currently, PDF) or that our usage profile
    // does not want to automatically download (in the future, PDF, because
    // they can get big.)
    if (partInfo.type !== 'text' &&
        partInfo.type !== 'image')
      disposition = 'attachment';

    // - But we don't care if they are signatures...
    if ((partInfo.type === 'application') &&
        (partInfo.subtype === 'pgp-signature' ||
         partInfo.subtype === 'pkcs7-signature'))
      return true;

    function stripArrows(s) {
      if (s[0] === '<')
        return s.slice(1, -1);
      return s;
    }

    function makePart(partInfo, filename) {

      return mailRep.makeAttachmentPart({
        name: filename || 'unnamed-' + (++unnamedPartCounter),
        contentId: partInfo.id ? stripArrows(partInfo.id) : null,
        type: (partInfo.type + '/' + partInfo.subtype).toLowerCase(),
        part: partInfo.partID,
        encoding: partInfo.encoding && partInfo.encoding.toLowerCase(),
        sizeEstimate: estimatePartSizeInBytes(partInfo),
        file: null,
        /*
        charset: (partInfo.params && partInfo.params.charset &&
                  partInfo.params.charset.toLowerCase()) || undefined,
        textFormat: (partInfo.params && partInfo.params.format &&
                     partInfo.params.format.toLowerCase()) || undefined
         */
      });
    }

    function makeTextPart(partInfo) {
      return mailRep.makeBodyPart({
        type: partInfo.subtype,
        part: partInfo.partID,
        sizeEstimate: partInfo.size,
        amountDownloaded: 0,
        // its important to know that sizeEstimate and amountDownloaded
        // do _not_ determine if the bodyRep is fully downloaded; the
        // estimated amount is not reliable
        // Zero-byte bodies are assumed to be accurate and we treat the file
        // as already downloaded.
        isDownloaded: partInfo.size === 0,
        // full internal IMAP representation
        // it would also be entirely appropriate to move
        // the information on the bodyRep directly?
        _partInfo: partInfo.size ? partInfo : null,
        content: ''
      });
    }

    if (disposition === 'attachment') {
      attachments.push(makePart(partInfo, filename));
      return true;
    }

    // - We must be an inline part or structure
    switch (partInfo.type) {
      // - related image
      case 'image':
        relatedParts.push(makePart(partInfo, filename));
        return true;
        break;
      // - content
      case 'text':
        if (partInfo.subtype === 'plain' ||
            partInfo.subtype === 'html') {
          bodyReps.push(makeTextPart(partInfo));
          return true;
        }
        break;
    }
    return false;
  }

  function chewMultipart(branch) {
    var partInfo = branch[0], i;

    // - We must be an inline part or structure
    // I have no idea why the multipart is the 'type' rather than the subtype?
    switch (partInfo.subtype) {
      // - for alternative, scan from the back to find the first part we like
      // XXX I believe in Thunderbird we observed some ridiculous misuse of
      // alternative that we'll probably want to handle.
      case 'alternative':
        for (i = branch.length - 1; i >= 1; i--) {
          var subPartInfo = branch[i][0];

          switch(subPartInfo.type) {
            case 'text':
              // fall out for subtype checking
              break;
            case 'multipart':
              // this is probably HTML with attachments, let's give it a try
              if (chewMultipart(branch[i])) {
                return true;
              }
              break;
            default:
              // no good, keep going
              continue;
          }

          switch (subPartInfo.subtype) {
            case 'html':
            case 'plain':
              // (returns true if successfully handled)
              if (chewLeaf(branch[i]), partInfo.subtype) {
                return true;
              }
          }
        }
        // (If we are here, we failed to find a valid choice.)
        return false;
      // - multipart that we should recurse into
      case 'mixed':
      case 'signed':
      case 'related':
        for (i = 1; i < branch.length; i++) {
          if (branch[i].length > 1) {
            chewMultipart(branch[i]);
          } else {
            chewLeaf(branch[i], partInfo.subtype);
          }
        }
        return true;

      default:
        console.warn('Ignoring multipart type:', partInfo.subtype);
        return false;
    }
  }

  if (msg.structure.length > 1) {
    chewMultipart(msg.structure);
  } else {
    chewLeaf(msg.structure);
  }

  return {
    bodyReps: bodyReps,
    attachments: attachments,
    relatedParts: relatedParts,
  };
};

exports.chewHeaderAndBodyStructure =
  function(msg, folderId, newMsgId) {
  // begin by splitting up the raw imap message
  var parts = chewStructure(msg);
  var rep = {};

  rep.header = mailRep.makeHeaderInfo({
    // the FolderStorage issued id for this message (which differs from the
    // IMAP-server-issued UID so we can do speculative offline operations like
    // moves).
    id: newMsgId,
    srvid: msg.id,
    // The sufficiently unique id is a concatenation of the UID onto the
    // folder id.
    suid: folderId + '/' + newMsgId,
    // The message-id header value; as GUID as get for now; on gmail we can
    // use their unique value, or if we could convince dovecot to tell us, etc.
    guid: msg.msg.meta.messageId,
    // mailparser models from as an array; we do not.
    author: msg.msg.from && msg.msg.from[0] ||
              // we require a sender e-mail; let's choose an illegal default as
              // a stopgap so we don't die.
              { address: 'missing-address@example.com' },
    to: ('to' in msg.msg) ? msg.msg.to : null,
    cc: ('cc' in msg.msg) ? msg.msg.cc : null,
    bcc: ('bcc' in msg.msg) ? msg.msg.bcc : null,

    replyTo: ('reply-to' in msg.msg.parsedHeaders) ?
               msg.msg.parsedHeaders['reply-to'] : null,

    date: msg.date,
    flags: msg.flags,
    hasAttachments: parts.attachments.length > 0,
    subject: msg.msg.subject || null,

    // we lazily fetch the snippet later on
    snippet: null
  });


  rep.bodyInfo = mailRep.makeBodyInfo({
    date: msg.date,
    size: 0,
    attachments: parts.attachments,
    relatedParts: parts.relatedParts,
    references: msg.msg.references,
    bodyReps: parts.bodyReps
  });

  return rep;
};

/**
 * Fill a given body rep with the content from fetching
 * part or the entire body of the message...
 *
 *    var body = ...;
 *    var header = ...;
 *    var content = (some fetched content)..
 *
 *    $imapchew.updateMessageWithFetch(
 *      header,
 *      bodyInfo,
 *      {
 *        bodyRepIndex: 0,
 *        text: '',
 *        buffer: Uint8Array|Null,
 *        bytesFetched: n,
 *        bytesRequested: n
 *      }
 *    );
 *
 *    // what just happend?
 *    // 1. the body.bodyReps[n].content is now the value of content.
 *    //
 *    // 2. we update .amountDownloaded with the second argument
 *    //    (number of bytes downloaded).
 *    //
 *    // 3. if snippet has not bee set on the header we create the snippet
 *    //    and set its value.
 *
 */
exports.updateMessageWithFetch = function(header, body, req, res, _LOG) {
  var bodyRep = body.bodyReps[req.bodyRepIndex];

  // check if the request was unbounded or we got back less bytes then we
  // requested in which case the download of this bodyRep is complete.
  if (!req.bytes || res.bytesFetched < req.bytes[1]) {
    bodyRep.isDownloaded = true;

    // clear private space for maintaining parser state.
    bodyRep._partInfo = null;
  }

  if (!bodyRep.isDownloaded && res.buffer) {
    bodyRep._partInfo.pendingBuffer = res.buffer;
  }

  bodyRep.amountDownloaded += res.bytesFetched;

  var data = $mailchew.processMessageContent(
    res.text, bodyRep.type, bodyRep.isDownloaded, req.createSnippet, _LOG
  );

  if (req.createSnippet) {
    header.snippet = data.snippet;
  }
  if (bodyRep.isDownloaded)
    bodyRep.content = data.content;
};

/**
 * Selects a desirable snippet body rep if the given header has no snippet.
 */
exports.selectSnippetBodyRep = function(header, body) {
  if (header.snippet)
    return -1;

  var bodyReps = body.bodyReps;
  var len = bodyReps.length;

  for (var i = 0; i < len; i++) {
    if (exports.canBodyRepFillSnippet(bodyReps[i])) {
      return i;
    }
  }

  return -1;
};

/**
 * Determines if a given body rep can be converted into a snippet. Useful for
 * determining which body rep to use when downloading partial bodies.
 *
 *
 *    var bodyInfo;
 *    $imapchew.canBodyRepFillSnippet(bodyInfo.bodyReps[0]) // true/false
 *
 */
exports.canBodyRepFillSnippet = function(bodyRep) {
  return (
    bodyRep &&
    bodyRep.type === 'plain' ||
    bodyRep.type === 'html'
  );
};


/**
 * Calculates and returns the correct estimate for the number of
 * bytes to download before we can display the body. For IMAP, that
 * includes the bodyReps and related parts. (POP3 is different.)
 */
exports.calculateBytesToDownloadForImapBodyDisplay = function(body) {
  var bytesLeft = 0;
  body.bodyReps.forEach(function(rep) {
    if (!rep.isDownloaded) {
      bytesLeft += rep.sizeEstimate - rep.amountDownloaded;
    }
  });
  body.relatedParts.forEach(function(part) {
    if (!part.file) {
      bytesLeft += part.sizeEstimate;
    }
  });
  return bytesLeft;
}



}); // end define
;
'use strict';

// XXX: This is copied from shared/js/mime_mapper.js until the
// download manager ships.

/**
 * MimeMapper helps gaia apps to decide the mapping of mimetype and extension.
 * The use cases often happen when apps need to know about the exact
 * mimetypes or extensions, such as to delegate the open web activity, we must
 * have suitable mimetypes or extensions to request the right activity
 *
 * The mapping is basically created according to:
 * http://en.wikipedia.org/wiki/Internet_media_type
 *
 * The supported formats are considered base on the deviceStorage properties:
 * http://dxr.mozilla.org/mozilla-central/toolkit/content/
 * devicestorage.properties
 *
 */
define('pop3/mime_mapper',[],function() {
return {
  // This list only contains the extensions we currently supported
  // We should make it more complete for further usages
  _typeToExtensionMap: {
    // Image
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/3gpp': '3gp',
    'audio/amr': 'amr',
    // Video
    'video/mp4': 'mp4',
    'video/mpeg': 'mpg',
    'video/ogg': 'ogg',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    // Application
    // If we want to support some types, like pdf, just add
    // 'application/pdf': 'pdf'
    'application/vcard': 'vcf',
    // Text
    'text/vcard': 'vcf',
    'text/x-vcard': 'vcf'
  },

  // This list only contains the mimetypes we currently supported
  // We should make it more complete for further usages
  _extensionToTypeMap: {
    // Image
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'jpe': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    // Audio
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'm4b': 'audio/mp4',
    'm4p': 'audio/mp4',
    'm4r': 'audio/mp4',
    'aac': 'audio/aac',
    'opus': 'audio/ogg',
    'amr': 'audio/amr',
    // Video
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'mpg': 'video/mpeg',
    'ogv': 'video/ogg',
    'ogx': 'video/ogg',
    'webm': 'video/webm',
    '3gp': 'video/3gpp',
    'ogg': 'video/ogg',
    // Application
    // If we want to support some extensions, like pdf, just add
    // 'pdf': 'application/pdf'
    // Text
    'vcf': 'text/vcard'
  },
  _parseExtension: function(filename) {
    var array = filename.split('.');
    return array.length > 1 ? array.pop() : '';
  },

  isSupportedType: function(mimetype) {
    return (mimetype in this._typeToExtensionMap);
  },

  isSupportedExtension: function(extension) {
    return (extension in this._extensionToTypeMap);
  },

  isFilenameMatchesType: function(filename, mimetype) {
    var extension = this._parseExtension(filename);
    var guessedType = this.guessTypeFromExtension(extension);
    return (guessedType == mimetype);
  },

  guessExtensionFromType: function(mimetype) {
    return this._typeToExtensionMap[mimetype];
  },

  guessTypeFromExtension: function(extension) {
    return this._extensionToTypeMap[extension];
  },

  // If mimetype is not in the supported list, we will try to
  // predict the possible valid mimetype based on extension.
  guessTypeFromFileProperties: function(filename, mimetype) {
    var extension = this._parseExtension(filename);
    var type = this.isSupportedType(mimetype) ?
      mimetype : this.guessTypeFromExtension(extension);
    return type || '';
  },

  // if mimetype is not supported, preserve the original extension
  // and add the predict result as new extension.
  // If both filename and mimetype are not supported, return the original
  // filename.
  ensureFilenameMatchesType: function(filename, mimetype) {
    if (!this.isFilenameMatchesType(filename, mimetype)) {
      var guessedExt = this.guessExtensionFromType(mimetype);
      if (guessedExt) {
        filename += '.' + guessedExt;
      }
    }
    return filename;
  }
};
});

define('pop3/pop3',['module', 'exports', 'rdcommon/log', 'net', 'crypto',
        './transport', 'mailparser/mailparser', '../mailapi/imap/imapchew',
        '../mailapi/syncbase',
        './mime_mapper', '../mailapi/allback'],
function(module, exports, log, net, crypto,
         transport, mailparser, imapchew,
         syncbase, mimeMapper, allback) {

  /**
   * The Pop3Client modules and classes are organized according to
   * their function, as follows, from low-level to high-level:
   *
   *      [Pop3Parser] parses raw protocol data from the server.
   *      [Pop3Protocol] handles the request/response semantics
   *                     along with the Request and Response classes,
   *                     which are mostly for internal use. Pop3Protocol
   *                     does not deal with I/O at all.
   *      [Pop3Client] hooks together the Protocol and a socket, and
   *                   handles high-level details like listing messages.
   *
   * In general, this tries to share as much code as possible with
   * IMAP/ActiveSync. We reuse imapchew.js to normalize POP3 MIME
   * messages in the same way as IMAP, to avoid spurious errors trying
   * to write yet another translation layer. All of the MIME parsing
   * happens in this file; transport.js contains purely wire-level
   * logic.
   *
   * Each Pop3Client is responsible for one connection only;
   * Pop3Account in GELAM is responsible for managing connection lifetime.
   *
   * As of this writing (Nov 2013), there was only one other
   * reasonably complete POP3 JavaScript implementation, available at
   * <https://github.com/ditesh/node-poplib>. It would have probably
   * worked, but since the protocol is simple, it seemed like a better
   * idea to avoid patching over Node-isms more than necessary (e.g.
   * avoiding Buffers, node socket-isms, etc.). Additionally, that
   * library only contained protocol-level details, so we would have
   * only really saved some code in transport.js.
   *
   * For error conditions, this class always normalizes errors into
   * the format as documented in the constructor below.
   * All external callbacks get passed node-style (err, ...).
   */

  function md5(s) {
    return crypto.createHash('md5').update(s).digest('hex').toLowerCase();
  }

  // Allow setTimeout and clearTimeout to be shimmed for unit tests.
  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);
  exports.setTimeoutFuncs = function(set, clear) {
    setTimeout = set;
    clearTimeout = clear;
  }

  /***************************************************************************
   * Pop3Client
   *
   * Connect to a POP3 server. `cb` is always invoked, with (err) if
   * the connction attempt failed. Options are as follows:
   *
   * @param {string} host
   * @param {string} username
   * @param {string} password
   * @param {string} port
   * @param {boolean|'plain'|'ssl'|'starttls'} crypto
   * @param {int} connTimeout optional connection timeout
   * @param {'apop'|'sasl'|'user-pass'} preferredAuthMethod first method to try
   * @param {boolean} debug True to dump the protocol to the console.
   *
   * The connection's current state is available at `.state`, with the
   * following values:
   *
   *   'disconnected', 'greeting', 'starttls', 'authorization', 'ready'
   *
   * All callback errors are normalized to the following form:
   *
   *    var err = {
   *      scope: 'connection|authentication|mailbox|message',
   *      name: '...',
   *      message: '...',
   *      request: Pop3Client.Request (if applicable),
   *      exception: (A socket error, if available),
   *    };
   *
   */
  var Pop3Client = exports.Pop3Client = function(options, cb) {
    // for clarity, list the available options:
    this.options = options = options || {};
    options.host = options.host || null;
    options.username = options.username || null;
    options.password = options.password || null;
    options.port = options.port || null;
    options.crypto = options.crypto || false;
    options.connTimeout = options.connTimeout || 30000;
    options.debug = options.debug || false;
    options.authMethods = ['apop', 'sasl', 'user-pass'];

    this._LOG = options._logParent ?
      LOGFAB.Pop3Client(this, options._logParent, Date.now() % 1000) : null;

    if (options.preferredAuthMethod) {
      // if we prefer a certain auth method, try that first.
      var idx = options.authMethods.indexOf(options.preferredAuthMethod);
      if (idx !== -1) {
        options.authMethods.splice(idx, 1);
      }
      options.authMethods.unshift(options.preferredAuthMethod);
    }

    // Normalize the crypto option:
    if (options.crypto === true) {
      options.crypto = 'ssl';
    } else if (!options.crypto) {
      options.crypto = 'plain';
    }

    if (!options.port) {
      options.port = {
        'plain': 110,
        'starttls': 110,
        'ssl': 995
      }[options.crypto];
      if (!options.port) {
        throw new Error('Invalid crypto option for Pop3Client: ' +
                        options.crypto);
      }
    }

    // The public state of the connection (the only one we really care
    // about is 'disconnected')
    this.state = 'disconnected';
    this.authMethod = null; // Upon successful login, the method that worked.

    // Keep track of the message IDs and UIDLs the server has reported
    // during this session (these values could change in each
    // session, though they probably won't):
    this.idToUidl = {};
    this.uidlToId = {};
    this.idToSize = {};
    // An array of {uidl: "", size: 0, number: } for each message
    // retrieved as a result of calling LIST
    this._messageList = null;
    this._greetingLine = null; // contains APOP auth info, if available

    this.protocol = new transport.Pop3Protocol();
    this.socket = net.connect(options.port, options.host,
                              options.crypto === 'ssl');

    var connectTimeout = setTimeout(function() {
      this.state = 'disconnected';
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cb && cb({
        scope: 'connection',
        request: null,
        name: 'unresponsive-server',
        message: 'Could not connect to ' + options.host + ':' + options.port +
          ' with ' + options.crypto + ' encryption.',
      });
    }.bind(this), options.connTimeout);

    if (options.debug) {
      this.attachDebugLogging();
    }

    // Hook the protocol and socket together:
    this.socket.on('data', this.protocol.onreceive.bind(this.protocol));
    this.protocol.onsend = this.socket.write.bind(this.socket);

    this.socket.on('connect', function() {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      this.state = 'greeting';
      // No further processing is needed here. We wait for the server
      // to send a +OK greeting before we try to authenticate.
    }.bind(this));

    this.socket.on('error', function(err) {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cb && cb({
        scope: 'connection',
        request: null,
        name: 'unresponsive-server',
        message: 'Socket exception: ' + JSON.stringify(err),
        exception: err,
      });
    }.bind(this));

    this.socket.on('close', function() {
      this.protocol.onclose();
      this.die();
    }.bind(this));

    // To track requests/responses in the presence of a server
    // greeting, store an empty request here. Our request/response
    // matching logic will pair the server's greeting with this
    // request.
    this.protocol.pendingRequests.push(
    new transport.Request(null, [], false, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'connection',
          request: null,
          name: 'unresponsive-server',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      // Store the greeting line, it might be needed in authentication
      this._greetingLine = rsp.getLineAsString(0);

      this._maybeUpgradeConnection(function(err) {
        if (err) { cb && cb(err); return; }
        this._thenAuthorize(function(err) {
          if (!err) {
            this.state = 'ready';
          }
          cb && cb(err);
        });
      }.bind(this));
    }.bind(this)));
  }

  /**
   * Disconnect from the server forcibly. Do not issue a QUIT command.
   */
  Pop3Client.prototype.disconnect =
  Pop3Client.prototype.die = function() {
    if (this.state !== 'disconnected') {
      this.state = 'disconnected';
      this.socket.end();
      // No need to do anything further; we'll tear down when we
      // receive the socket's "close" event.
    }
  }

  /**
   * Attach a console logger that prints out any socket data sent or
   * received, blurring out authentication credentials. This is
   * automatically attached if {'debug': true} is passed as an option
   * to the constructor.
   */
  Pop3Client.prototype.attachDebugLogging = function() {
    // This isn't perfectly accurate; lines can split over packet/recv
    // boundaries, but it should be good enough for debug logging.
    // Because we always send a full command with the `.write()`
    // function, though, the outgoing data (thus credential hiding)
    // will always work.
    this.socket.on('data', function(data) {
      var s = bufferToPrintable(data);
      var color = (s.indexOf('-ERR') === -1 ? '\x1b[32m' : '\x1b[31m');
      dump('<-- ' + color + s + '\x1b[0;37m\n');
    });
    var oldWrite = this.socket.write;
    this.socket.write = function(data) {
      var s = bufferToPrintable(data);
      s = s.replace(/(AUTH|USER|PASS|APOP)(.*?)\\r\\n/g,
                    '$1 ***CREDENTIALS HIDDEN***\\r\\n');
      dump('--> ' + '\x1b[0;33m' + s + '\x1b[0;37m\n');
      return oldWrite.apply(this, arguments);
    }.bind(this.socket);
  }

  /**
   * Fetch the capabilities from the server. If the connection
   * supports STLS and we've specified 'starttls' as the crypto
   * option, we upgrade the connection here.
   */
  // XXX: UNUSED FOR NOW. Maybe we'll use it later.
  Pop3Client.prototype._getCapabilities = function(cb) {
    this.protocol.sendRequest('CAPA', [], true, function(err, rsp) {
      if (err) {
        // It's unlikely this server's going to do much, but we'll try.
        this.capabilities = {};
      } else {
        var lines = rsp.getDataLines();
        for (var i = 0; i < lines.length; i++) {
          var words = lines[i].split(' ');
          this.capabilities[words[0]] = words.slice(1);
        }
      }
    }.bind(this));
  }

  /**
   * If we're trying to use TLS, upgrade now.
   *
   * This is followed by ._thenAuthorize().
   */
  Pop3Client.prototype._maybeUpgradeConnection = function(cb) {
    if (this.options.crypto === 'starttls') {
      this.state = 'starttls';
      this.protocol.sendRequest('STLS', [], false, function(err, rsp) {
        if (err) {
          cb && cb({
            scope: 'connection',
            request: err.request,
            name: 'bad-security',
            message: err.getStatusLine(),
            response: err,
          });
          return;
        }
        this.socket.upgradeToSecure();
        cb();
      }.bind(this));
    } else {
      cb();
    }
  }

  /**
   * Set the current state to 'authorization' and attempts to
   * authenticate the user with any available authentication method.
   * We try APOP first if the server supports it, since we can avoid
   * replay attacks and authenticate in one roundtrip. Otherwise, we
   * try SASL AUTH PLAIN, which POP3 servers are (in theory) required
   * to support if they support SASL at all. Lastly, we fall back to
   * plain-old USER/PASS authentication if that's all we have left.
   *
   * Presently, if one authentication method fails for any reason, we
   * simply try the next. We could be smarter and drop out on
   * detecting a bad-user-or-pass error.
   */
  Pop3Client.prototype._thenAuthorize = function(cb) {
    this.state = 'authorization';

    this.authMethod = this.options.authMethods.shift();

    var user = this.options.username;
    var pass = this.options.password;
    var secret;
    switch(this.authMethod) {
    case 'apop':
      var match = /<.*?>/.exec(this._greetingLine || "");
      var apopTimestamp = match && match[0];
      if (!apopTimestamp) {
        // if the server doesn't support APOP, try the next method.
        this._thenAuthorize(cb);
      } else {
        secret = md5(apopTimestamp + pass);
        this.protocol.sendRequest(
          'APOP', [user, secret], false, function(err, rsp) {
          if (err) {
            this._greetingLine = null; // try without APOP
            this._thenAuthorize(cb);
          } else {
            cb(); // ready!
          }
        }.bind(this));
      }
      break;
    case 'sasl':
      secret = btoa(user + '\x00' + user + '\x00' + pass);
      this.protocol.sendRequest(
        'AUTH', ['PLAIN', secret], false, function(err, rsp) {
        if (err) {
          this._thenAuthorize(cb);
        } else {
          cb(); // ready!
        }
      }.bind(this));
      break;
    case 'user-pass':
    default:
      this.protocol.sendRequest('USER', [user], false, function(err, rsp) {
        if (err) {
          cb && cb({
            scope: 'authentication',
            request: err.request,
            name: 'bad-user-or-pass',
            message: err.getStatusLine(),
            response: err,
          });
          return;
        }
        this.protocol.sendRequest('PASS', [pass], false, function(err, rsp) {
          if (err) {
            cb && cb({
              scope: 'authentication',
              request: err.request,
              name: 'bad-user-or-pass',
              message: err.getStatusLine(),
              response: err,
            });
            return;
          }
          cb();
        }.bind(this));
      }.bind(this));
      break;
    }
  }

  /*********************************************************************
   * MESSAGE FETCHING
   *
   * POP3 does not support granular partial retrieval; we can only
   * download a given number of _lines_ of the message (including
   * headers). Thus, in order to download snippets of messages (rather
   * than just the entire body), we have to guess at how many lines
   * it'll take to get enough MIME data to be able to parse out a
   * text/plain snippet.
   *
   * For now, we'll try to download a few KB of the message, which
   * should give plenty of data to form a snippet. We're aiming for a
   * sweet spot, because if the message is small enough, we can just
   * download the whole thing and be done.
   */

  /**
   * Issue a QUIT command to the server, persisting any DELE message
   * deletions you've enqueued. This also closes the connection.
   */
  Pop3Client.prototype.quit = function(cb) {
    this.state = 'disconnected';
    this.protocol.sendRequest('QUIT', [], false, function(err, rsp) {
      this.disconnect();
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
      } else {
        cb && cb();
      }
    }.bind(this));
  }

  /**
   * Load a mapping of server message numbers to UIDLs, so that we
   * can interact with messages stably across sessions. Additionally,
   * this fetches a LIST of the messages so that we have a list of
   * message sizes in addition to their UIDLs.
   */
  Pop3Client.prototype._loadMessageList = function(cb) {
    // if we've already loaded IDs this session, we don't need to
    // compute them again, because POP3 shows a frozen state of your
    // mailbox until you disconnect.
    if (this._messageList) {
      cb(null, this._messageList);
      return;
    }
    // First, get UIDLs for each message.
    this.protocol.sendRequest('UIDL', [], true, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var lines = rsp.getDataLines();
      for (var i = 0; i < lines.length; i++) {
        var words = lines[i].split(' ');
        var number = words[0];
        var uidl = words[1];
        this.idToUidl[number] = uidl;
        this.uidlToId[uidl] = number
      }
      // because POP3 servers process requests serially, the next LIST
      // will not run until after this completes.
    }.bind(this));

    // Then, get a list of messages so that we can track their size.
    this.protocol.sendRequest('LIST', [], true, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var lines = rsp.getDataLines();
      var allMessages = [];
      for (var i = 0; i < lines.length; i++) {
        var words = lines[i].split(' ');
        var number = words[0];
        var size = parseInt(words[1], 10);
        this.idToSize[number] = size;
        // Push the message onto the front, so that the last line
        // becomes the first message in allMessages. Most POP3 servers
        // seem to return messages in ascending date order, so we want
        // to process the newest messages first. (Tested with Dovecot,
        // Gmail, and AOL.) The resulting list here contains the most
        // recent message first.
        allMessages.unshift({
          uidl: this.idToUidl[number],
          size: size,
          number: number
        });
      }

      this._messageList = allMessages;
      cb && cb(null, allMessages);
    }.bind(this));
  }

  /**
   * Fetch the headers and snippets for all messages. Only retrieves
   * messages for which filterFunc(uidl) returns true.
   *
   * @param {object} opts
   * @param {function(uidl)} opts.filter Only store messages matching filter
   * @param {function(evt)} opts.progress Progress callback
   * @param {int} opts.checkpointInterval Call `checkpoint` every N messages
   * @param {int} opts.maxMessages Download _at most_ this many
   *   messages during this listMessages invocation. If we find that
   *   we would have to download more than this many messages, mark
   *   the rest as "overflow" messages that could be downloaded in a
   *   future sync iteration. (Default is infinite.)
   * @param {function(next)} opts.checkpoint Callback to periodically save state
   * @param {function(err, numSynced, overflowMessages)} cb
   *   Upon completion, returns the following data:
   *
   *   numSynced: The number of messages synced.
   *
   *   overflowMessages: An array of objects with the following structure:
   *
   *       { uidl: "", size: 0 }
   *
   *     Each message in overflowMessages was NOT downloaded. Instead,
   *     you should store those UIDLs for future retrieval as part of
   *     a "Download More Messages" operation.
   */
  Pop3Client.prototype.listMessages = function(opts, cb) {
    var filterFunc = opts.filter;
    var progressCb = opts.progress;
    var checkpointInterval = opts.checkpointInterval || null;
    var maxMessages = opts.maxMessages || Infinity;
    var checkpoint = opts.checkpoint;
    var overflowMessages = [];

    // Get a mapping of number->UIDL.
    this._loadMessageList(function(err, unfilteredMessages) {
      if (err) { cb && cb(err); return; }

      // Calculate which messages we would need to download.
      var totalBytes = 0;
      var bytesFetched = 0;
      var messages = [];
      var seenCount = 0;
      // Filter out unwanted messages.
      for (var i = 0; i < unfilteredMessages.length; i++) {
        var msgInfo = unfilteredMessages[i];
        if (!filterFunc || filterFunc(msgInfo.uidl)) {
          if (messages.length < maxMessages) {
            totalBytes += msgInfo.size;
            messages.push(msgInfo);
          } else {
            overflowMessages.push(msgInfo);
          }
        } else {
          seenCount++;
        }
      }

      console.log('POP3: listMessages found ' +
                  messages.length + ' new, ' +
                  overflowMessages.length + ' overflow, and ' +
                  seenCount + ' seen messages. New UIDLs:');

      messages.forEach(function(m) {
        console.log('POP3: ' + m.size + ' bytes: ' + m.uidl);
      });

      var totalMessages = messages.length;
      // If we don't provide a checkpoint interval, just do all
      // messages at once.
      if (!checkpointInterval) {
        checkpointInterval = totalMessages;
      }

      // Download all of the messages in batches.
      var nextBatch = function() {
        console.log('POP3: Next batch. Messages left: ' + messages.length);
        // If there are no more messages, we're done.
        if (!messages.length) {
          console.log('POP3: Sync complete. ' +
                      totalMessages + ' messages synced, ' +
                      overflowMessages.length + ' overflow messages.');
          cb && cb(null, totalMessages, overflowMessages);
          return;
        }

        var batch = messages.splice(0, checkpointInterval);
        var latch = allback.latch();

        // Trigger a download for every message in the batch.
        batch.forEach(function(m, idx) {
          var messageDone = latch.defer();
          this.downloadPartialMessageByNumber(m.number, function(err, msg) {
            bytesFetched += m.size;
            progressCb && progressCb({
              totalBytes: totalBytes,
              bytesFetched: bytesFetched,
              size: m.size,
              message: msg
            });
            messageDone(err);
          });
        }.bind(this));

        // When all messages in this batch have completed, trigger the
        // next batch to begin download. If `checkpoint` is provided,
        // we'll wait for it to tell us to continue (so that we can
        // save the database periodically or perform other
        // housekeeping during sync).
        latch.then(function(results) {
          console.log('POP3: Checkpoint.');
          if (checkpoint) {
            checkpoint(nextBatch);
          } else {
            nextBatch();
          }
        });
      }.bind(this);

      // Kick it off, maestro.
      nextBatch();

    }.bind(this));
  }

  /**
   * Retrieve the full body (+ attachments) of a message given a UIDL.
   *
   * @param {string} uidl The message's UIDL as reported by the server.
   */
  Pop3Client.prototype.downloadMessageByUidl = function(uidl, cb) {
    this._loadMessageList(function(err) {
      if (err) {
        cb && cb(err);
      } else {
        this.downloadMessageByNumber(this.uidlToId[uidl], cb);
      }
    }.bind(this));
  }

  /**
   * Retrieve a portion of one message. The returned message is
   * normalized to the format needed by GELAM according to
   * `parseMime`.
   *
   * @param {string} number The message number (on the server)
   * @param {function(err, msg)} cb
   */
  // XXX: TODO: There are some roundtrips between strings and buffers
  // here. This is generally safe (converting to and from UTF-8), but
  // it creates unnecessary garbage. Clean this up when we switch over
  // to jsmime.
  Pop3Client.prototype.downloadPartialMessageByNumber = function(number, cb) {
    // Based on SNIPPET_SIZE_GOAL, calculate approximately how many
    // lines we'll need to fetch in order to roughly retrieve
    // SNIPPET_SIZE_GOAL bytes.
    var numLines = Math.floor(syncbase.POP3_SNIPPET_SIZE_GOAL / 80);
    this.protocol.sendRequest('TOP', [number, numLines],
                              true, function(err, rsp) {
      if(err) {
        cb && cb({
          scope: 'message',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var fullSize = this.idToSize[number];
      var data = rsp.getDataAsString();
      var isSnippet = (!fullSize || data.length < fullSize);
      // If we didn't get enough data, msg.body.bodyReps may be empty.
      // The values we use for retrieving snippets are
      // sufficiently large that we really shouldn't run into this
      // case in nearly all cases. We assume that the UI will
      // handle this (exceptional) case reasonably.
      cb(null, this.parseMime(data, isSnippet, number));
    }.bind(this));
  }

  /**
   * Retrieve a message in its entirety, given a server-centric number.
   *
   * @param {string} number The message number (on the server)
   * @param {function(err, msg)} cb
   */
  Pop3Client.prototype.downloadMessageByNumber = function(number, cb) {
    this.protocol.sendRequest('RETR', [number], true, function(err, rsp) {
      if(err) {
        cb && cb({
          scope: 'message',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }
      cb(null, this.parseMime(rsp.getDataAsString(), false, number));
    }.bind(this));
  }

  /**
   * Convert a MailParser-intermediate MIME tree to a structure
   * format as parsable with imapchew. This allows us to reuse much of
   * the parsing code and maintain parity between IMAP and POP3.
   */
  function mimeTreeToStructure(node, partId, partMap, partialNode) {
    var structure = [];
    var contentType = node.meta.contentType.split('/');
    var typeInfo = {};
    typeInfo.type = contentType[0];
    typeInfo.subtype = contentType[1];
    typeInfo.params = {};
    typeInfo.params.boundary = node.meta.mimeBoundary || null;
    typeInfo.params.format = node.meta.textFormat || null;
    typeInfo.params.charset = node.meta.charset || null;
    typeInfo.params.name = node.meta.fileName || null;
    if (node.meta.contentDisposition) {
      typeInfo.disposition = {
        type: node.meta.contentDisposition,
        params: {},
      };
      if (node.meta.fileName) {
        typeInfo.disposition.params.filename = node.meta.fileName;
      }
    }
    typeInfo.partID = partId || '1';
    typeInfo.id = node.meta.contentId;
    typeInfo.encoding = 'binary'; // we already decoded it
    typeInfo.size = node.content && node.content.length || 0;
    typeInfo.description = null; // unsupported (unnecessary)
    typeInfo.lines = null; // unsupported (unnecessary)
    typeInfo.md5 = null; // unsupported (unnecessary)

    // XXX: see ActiveSync Folder._updateBody. Unit tests get angry if
    // there's a trailing newline in a body part.
    if (node.content != null) {
      if (typeInfo.type === 'text' &&
          node.content.length &&
          node.content[node.content.length - 1] === '\n') {
        node.content = node.content.slice(0, -1);
        typeInfo.size--;
      }
      partMap[typeInfo.partID] = node.content;
      // If this node was only partially downloaded, note it as such
      // in a special key on partMap. We'll use this key to later
      // indicate that this part's size should be calculated based on
      // the bytes we have not downloaded yet.
      if (partialNode === node) {
        partMap['partial'] = typeInfo.partID;
      }
    }

    structure.push(typeInfo);
    if (node.childNodes.length) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        structure.push(mimeTreeToStructure(
          child, typeInfo.partID + '.' + (i + 1), partMap, partialNode));
      }
    }
    return structure;
  }

  // This function is made visible for test logic external to this module.
  Pop3Client.parseMime = function(content) {
    return Pop3Client.prototype.parseMime.call(this, content);
  }

  Pop3Client.prototype.parseMime = function(mimeContent, isSnippet, number) {
    var mp = new mailparser.MailParser();
    mp._write(mimeContent);
    mp._process(true);
    var rootNode = mp.mimeTree;
    var partialNode = (isSnippet ? mp._currentNode : null);
    var estSize = number && this.idToSize[number] || mimeContent.length;
    var content;

    var partMap = {}; // partId -> content
    var msg = {
      id: number && this.idToUidl[number], // the server-given ID
      msg: rootNode,
      date: rootNode.meta.date && rootNode.meta.date.valueOf(),
      flags: [],
      structure: mimeTreeToStructure(rootNode, '1', partMap, partialNode),
    };

    var rep = imapchew.chewHeaderAndBodyStructure(msg, null, null);
    var bodyRepIdx = imapchew.selectSnippetBodyRep(rep.header, rep.bodyInfo);

    // Calculate the proper size for all of the parts. Any part we've
    // seen will have been fully downloaded, so we have the whole
    // thing. We must just attribute the rest of the size to the one
    // unfinished part, whose partId is stored in partMap['partial'].
    var partSizes = {};
    var usedSize = 0;
    var partialPartKey = partMap['partial'];
    for (var k in partMap) {
      if (k === 'partial') { continue; };
      if (k !== partialPartKey) {
        usedSize += partMap[k].length;
        partSizes[k] = partMap[k].length;
      }
    }
    if (partialPartKey) {
      partSizes[partialPartKey] = estSize - usedSize;
    }

    for (var i = 0; i < rep.bodyInfo.bodyReps.length; i++) {
      var bodyRep = rep.bodyInfo.bodyReps[i];
      content = partMap[bodyRep.part];
      if (content != null) {
        var req = {
          // If bytes is null, imapchew.updateMessageWithFetch knows
          // that we've fetched the entire thing. Passing in [-1, -1] as a
          // range tells imapchew that we're not done downloading it yet.
          bytes: (partialPartKey === bodyRep.part ? [-1, -1] : null),
          bodyRepIndex: i,
          createSnippet: i === bodyRepIdx,
        };
        bodyRep.size = partSizes[bodyRep.part];
        var res = {bytesFetched: content.length, text: content};
        imapchew.updateMessageWithFetch(
          rep.header, rep.bodyInfo, req, res, this._LOG);
      }
    }


    // Convert attachments and related parts to Blobs if we've
    // downloaded the whole thing:

    for (var i = 0; i < rep.bodyInfo.relatedParts.length; i++) {
      var relatedPart = rep.bodyInfo.relatedParts[i];
      relatedPart.sizeEstimate = partSizes[relatedPart.part];
      content = partMap[relatedPart.part];
      if (content != null && partialPartKey !== relatedPart.part) {
        relatedPart.file = new Blob([content], {type: relatedPart.type});
      }
    }

    for (var i = 0; i < rep.bodyInfo.attachments.length; i++) {
      var att = rep.bodyInfo.attachments[i];
      content = partMap[att.part];
      att.sizeEstimate = partSizes[att.part];
      if (content != null && partialPartKey !== att.part &&
          mimeMapper.isSupportedType(att.type)) {
        att.file = new Blob([content], {type: att.type});
      }
    }

    // If it's a snippet and we aren't sure that we have attachments,
    // guess based on what we know.
    if (isSnippet &&
        !rep.header.hasAttachments &&
        (rootNode.parsedHeaders['x-ms-has-attach'] ||
         rootNode.meta.mimeMultipart === 'mixed' ||
         estSize > syncbase.POP3_INFER_ATTACHMENTS_SIZE)) {
      rep.header.hasAttachments = true;
    }

    // If we haven't downloaded the entire message, we need to have
    // some way to tell the UI that we actually haven't downloaded all
    // of the bodyReps yet. We add this fake bodyRep here, indicating
    // that it isn't fully downloaded, so that when the user triggers
    // downloadBodyReps, we actually try to fetch the message. In
    // POP3, we _don't_ know that we have all bodyReps until we've
    // downloaded the whole thing. There could be parts hidden in the
    // data we haven't downloaded yet.
    rep.bodyInfo.bodyReps.push({
      type: 'fake', // not 'text' nor 'html', so it won't be rendered
      part: 'fake',
      sizeEstimate: 0,
      amountDownloaded: 0,
      isDownloaded: !isSnippet,
      content: null,
      size: 0,
    });

    // POP3 can't display the completely-downloaded-body until we've
    // downloaded the entire message, including attachments. So
    // unfortunately, no matter how much we've already downloaded, if
    // we haven't downloaded the whole thing, we can't start from the
    // middle.
    rep.header.bytesToDownloadForBodyDisplay = (isSnippet ? estSize : 0);

    // to fill: suid, id
    return rep;
  }

  /**
   * Display a buffer in a debug-friendly printable format, with
   * CRLFs escaped for easy protocol verification.
   */
  function bufferToPrintable(line) {
    var s = '';
    if (Array.isArray(line)) {
      line.forEach(function(l) {
        s += bufferToPrintable(l) + '\n';
      });
      return s;
    }
    for (var i = 0; i < line.length; i++) {
      var c = String.fromCharCode(line[i]);
      if (c === '\r') { s += '\\r'; }
      else if (c === '\n') { s += '\\n'; }
      else { s += c; }
    }
    return s;
  }

var LOGFAB = exports.LOGFAB = log.register(module, {
  Pop3Client: {
    type: log.CONNECTION,
    subtype: log.CLIENT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      htmlParseError: { ex: log.EXCEPTION },
      htmlSnippetError: { ex: log.EXCEPTION },
      textChewError: { ex: log.EXCEPTION },
      textSnippetError: { ex: log.EXCEPTION },
    },
    asyncJobs: {
    },
  },
}); // end LOGFAB

Pop3Client._LOG = LOGFAB.Pop3Client();

}); // end define
;