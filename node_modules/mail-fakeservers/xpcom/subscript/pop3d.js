/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/**
 * Contributors:
 *   Ben Bucksch <ben.bucksch beonex.com> <http://business.beonex.com> (RFC 5034 Authentication)
 */
/* This file implements test POP3 servers
 */

var EXPORTED_SYMBOLS = [
  'pop3Daemon',
  'POP3_RFC1939_handler',
  'POP3_RFC2449_handler',
  'POP3_RFC5034_handler'
];

//Components.utils.import("resource://gre/modules/IOUtils.js");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://fakeserver/subscript/mime.jsm");
//Components.utils.import("resource://testing-common/mailnews/auth.js");

// Since we don't really need to worry about peristence, we can just
// use a UIDL counter.
var gUIDLCount = 1;

/**
 * Read the contents of a file to the string.
 *
 * @param fileName A path relative to the current working directory, or
 *                 a filename underneath the "data" directory relative to
 *                 the cwd.
 */
function readFile(fileName) {
  let cwd = Services.dirsvc.get("CurWorkD", Ci.nsIFile);

  // Try to find the file relative to either the data directory or to the
  // current working directory.
  let file = cwd.clone();
  if ("@mozilla.org/windows-registry-key;1" in Components.classes) {
    // Windows doesn't allow '..' in appendRelativePath,
    // so we'll have to do this the long way.
    if (fileName.contains('/')) {
      let parts = fileName.split('/');
      for (let part of parts) {
        if (part == "..")
          file = file.parent;
        else
          file.append(part);
      }
    }
    else {
      file.append("data");
      file.append(fileName);
    }
  } else {
    file.appendRelativePath("data/" + fileName);
    if (!file.exists()) {
      file = cwd.clone();
      file.appendRelativePath(fileName);
    }
  }

  if (!file.exists())
    throw new Error("Cannot find file named " + fileName);

  return IOUtils.loadFileToString(file);
}

function pop3Daemon(flags) {
  this._messages = [];
}
pop3Daemon.prototype = {
  _messages: null,
  _totalMessageSize: 0,

  /**
   * Set the messages that the POP3 daemon will provide to its clients.
   *
   * @param messages An array of either 1) strings that are filenames whose
   *     contents will be loaded from the files or 2) objects with a "fileData"
   *     attribute whose value is the content of the file.
   */
  setMessages: function(messages) {
    this._messages = [];
    this._totalMessageSize = 0;

    function addMessage(element) {
      // if it's a string, then it's a file-name.
      if (typeof element == "string")
        this._messages.push( { fileData: readFile(element), size: -1 });
      // otherwise it's an object as dictionary already
      else
        this._messages.push(element);

      var msg = this._messages[this._messages.length - 1];
      msg.parsed = convertRfc2822RepToMessageRep(msg.fileData);
    }
    messages.forEach(addMessage, this);

    // Sort the messages in ascending (oldest first) order, to match
    // the way other servers (Dovecot, Gmail, AOL) return messages.
    // Our unit tests assume that they come back this way.
    this._messages.sort(function(a, b) {
      return a.parsed.date - b.parsed.date;
    });

    for (var i = 0; i < this._messages.length; ++i) {
      this._messages[i].size = this._messages[i].fileData.length;
      this._messages[i].uidl = "UIDL" + gUIDLCount++;
      this._totalMessageSize += this._messages[i].size;
   }
  },
  getTotalMessages: function() {
    return this._messages.length;
  },
  getTotalMessageSize: function() {
    return this._totalMessageSize;
  }
};

///////////////////////////////////////////////////////////////////////////////
//                              POP3 TEST SERVERS                            //
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


const kPop3StateAuthNeeded = 1; // Not authenticated yet, need username and password
const kPop3StateAuthPASS = 2; // got command USER, expecting command PASS
const kPop3StateTransaction = 3; // Authenticated, can fetch and delete mail

function periodStuff(s) {
  return s.replace(/^\./mg, '..');
}

/**
 * This handler implements the bare minimum required by RFC 1939.
 * If dropOnAuthFailure is set, the server will drop the connection
 * on authentication errors, to simulate servers that do the same.
 */
function POP3_RFC1939_handler(daemon) {
  this._daemon = daemon;
  this.closing = false;
  this.dropOnAuthFailure = false;
  this.resetTest();
}
POP3_RFC1939_handler.prototype = {

  resetTest : function() {
    this._state = kPop3StateAuthNeeded;
  },

  USER: function (args) {
    if (this._state != kPop3StateAuthNeeded)
      return "-ERR invalid state";

    if (args == this._daemon.kUsername) {
      this._state = kPop3StateAuthPASS;
      return "+OK user recognized";
    }

    return "-ERR sorry, no such mailbox";
  },
  PASS: function (args) {
    if (this._state != kPop3StateAuthPASS)
      return "-ERR invalid state";

    if (args == this._daemon.kPassword) {
      this._state = kPop3StateTransaction;
      return "+OK maildrop locked and ready";
    }

    this._state = kPop3StateAuthNeeded;
    if (this.dropOnAuthFailure)
      this.closing = true;
    return "-ERR invalid password";
  },
  STAT: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";

    return "+OK " + this._daemon.getTotalMessages() + " " +
           this._daemon.getTotalMessageSize();
  },
  LIST: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";

    var result = "+OK " + this._daemon._messages.length + " messages\r\n";
    for (var i = 0; i < this._daemon._messages.length; ++i)
      result += (i + 1) + " " + this._daemon._messages[i].size + "\r\n";

    result += ".";
    return result;
  },
  UIDL: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";

    args = args.split(' ');
    var msgNo = args[0];
    if (msgNo) {
      let i = parseInt(msgNo, 10) - 1;
      let msg = this._daemon._messages[i];
      if (msg) {
        return "+OK " + (i+1) + " " + msg.uidl + "\r\n";
      } else {
        return "-ERR invalid message number";
      }
    } else {
      let result = "+OK\r\n";
      for (let i = 0; i < this._daemon._messages.length; ++i)
        result += (i + 1) + " " + this._daemon._messages[i].uidl + "\r\n";
      result += ".";
      return result;
    }
  },
  RETR: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";
    var msg = this._daemon._messages[args - 1];
    if (!msg) {
      return "-ERR no message with that number";
    }
    var result = "+OK " + msg.size + "\r\n";
    result += periodStuff(msg.fileData);
    result += ".";
    return result;
  },
  DELE: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";
    return "+OK";
  },
  NOOP: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";
    return "+OK";
  },
  RSET: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";
    this._state = kPop3StateAuthNeeded;
    return "+OK";
  },
  QUIT: function (args) {
    // Let the client close the socket
    //this.closing = true;
    return "+OK fakeserver signing off";
  },
  onStartup: function () {
    this.closing = false;
    this._state = kPop3StateAuthNeeded;
    return "+OK Fake POP3 server ready";
  },
  onError: function (command, args) {
    return "-ERR command " + command + " not implemented";
  },
  onServerFault: function (e) {
    return "-ERR internal server error: " + e;
  },
  postCommand: function(reader) {
    reader.setMultiline(this._multiline);
    if (this.closing)
      reader.closeSocket();
  }
};


/**
 * This implements CAPA
 * @see RFC 2449
 *
 * Not yet implemented, but desired are: TOP, UIDL, ...
 */
function POP3_RFC2449_handler(daemon) {
  POP3_RFC1939_handler.call(this, daemon);
}
POP3_RFC2449_handler.prototype = {
  __proto__ : POP3_RFC1939_handler.prototype, // inherit

  kCapabilities: ["UIDL"], // the test may adapt this as necessary

  CAPA: function (args) {
    var capa = "+OK List of our wanna-be capabilities follows:\r\n";
    for (var i = 0; i < this.kCapabilities.length; i++)
      capa += this.kCapabilities[i] + "\r\n";
    if (this.capaAdditions)
      capa += this.capaAdditions();
    capa += "IMPLEMENTATION fakeserver\r\n" + ".";
    return capa;
  },

  TOP: function (args) {
    if (this._state != kPop3StateTransaction)
      return "-ERR invalid state";

    if (this._daemon._messages.length === 0) {
      return "-ERR no messages in folder";
    }

    args = args.split(' ');
    var msgNo = args[0];
    var lines = args[1];

    if (!this._daemon._messages[msgNo - 1]) {
      return "-ERR invalid message number";
    }

    var result = "+OK " + this._daemon._messages[msgNo - 1].size + "\r\n";
    // skip the headers
    var data = this._daemon._messages[msgNo - 1].fileData;
    var header = data.substr(0, data.indexOf('\r\n\r\n') + 4);
    var body = data.substr(header.length);
    result += header;
    var endIdx = 0;
    for (var n = 0; n < lines; n++) {
      var nextIdx = body.indexOf('\r\n', endIdx);
      if (nextIdx === -1) {
        endIdx = body.length;
        break;
      } else {
        endIdx = nextIdx + 2;
      }
    }
    result += periodStuff(body.substr(0, endIdx));
    result += ".";
    return result;
  },
};


/**
 * This implements the AUTH command, i.e. authentication using CRAM-MD5 etc.
 * @see RFC 5034
 * @author Ben Bucksch <ben.bucksch beonex.com> <http://business.beonex.com>
 */
function POP3_RFC5034_handler(daemon) {
  POP3_RFC2449_handler.call(this, daemon);

  this._kAuthSchemeStartFunction = {};
  this._kAuthSchemeStartFunction["CRAM-MD5"] = this.authCRAMStart;
  this._kAuthSchemeStartFunction["PLAIN"] = this.authPLAINStart;
  this._kAuthSchemeStartFunction["LOGIN"] = this.authLOGINStart;
}
POP3_RFC5034_handler.prototype = {
  __proto__ : POP3_RFC2449_handler.prototype, // inherit

  kAuthSchemes: [ "CRAM-MD5", "PLAIN", "LOGIN" ], // the test may adapt this as necessary

  _usedCRAMMD5Challenge : null, // not base64-encoded

  // called by this.CAPA()
  capaAdditions : function() {
    var capa = "";
    if (this.kAuthSchemes.length > 0) {
      capa += "SASL";
      for (var i = 0; i < this.kAuthSchemes.length; i++)
        capa += " " + this.kAuthSchemes[i];
      capa += "\r\n";
    }
    return capa;
  },
  AUTH: function (lineRest) {
    // |lineRest| is a string containing the rest of line after "AUTH "
    if (this._state != kPop3StateAuthNeeded)
      return "-ERR invalid state";

    // AUTH without arguments returns a list of supported schemes
    if (!lineRest) {
      var capa = "+OK I like:\r\n";
      for (var i = 0; i < this.kAuthSchemes.length; i++)
        capa += this.kAuthSchemes[i] + "\r\n";
      capa += ".\r\n";
      return capa;
    }

    var args = lineRest.split(" ");
    var scheme = args[0].toUpperCase();
    // |scheme| contained in |kAuthSchemes|?
    if (!this.kAuthSchemes.some(function (s) { return s == scheme; }))
      return "-ERR AUTH " + scheme + " not supported";

    var func = this._kAuthSchemeStartFunction[scheme];
    if (!func || typeof(func) != "function")
      return "-ERR I just pretended to implement AUTH " + scheme + ", but I don't";
    return func.call(this, args[1]);
  },

  onMultiline: function(line) {
    if (this._nextAuthFunction) {
      var func = this._nextAuthFunction;
      this._multiline = false;
      this._nextAuthFunction = undefined;
      if (line == "*") {
        return "-ERR Okay, as you wish. Chicken";
      }
      if (!func || typeof(func) != "function") {
        return "-ERR I'm lost. Internal server error during auth";
      }
      try {
        return func.call(this, line);
      } catch (e) { return "-ERR " + e; }
    }

    if (POP3_RFC2449_handler.prototype.onMultiline)
      return POP3_RFC2449_handler.prototype.onMultiline.call(this, line); // call parent
    return undefined;
  },


  authPLAINStart : function (lineRest)
  {
    this._nextAuthFunction = this.authPLAINCred;
    if (lineRest.length) {
      return this.authPLAINCred(lineRest);
    } else {
      this._multiline = true;
      return "+";
    }
  },
  authPLAINCred : function (line)
  {
    var req = AuthPLAIN.decodeLine(line);
    if (req.username == this._daemon.kUsername &&
        req.password == this._daemon.kPassword) {
      this._state = kPop3StateTransaction;
      return "+OK Hello friend! Friends give friends good advice: Next time, use CRAM-MD5";
    }
    else {
      if (this.dropOnAuthFailure)
        this.closing = true;
      return "-ERR Wrong username or password, crook!";
    }
  },

  authCRAMStart : function (lineRest)
  {
    this._nextAuthFunction = this.authCRAMDigest;
    this._multiline = true;

    this._usedCRAMMD5Challenge = AuthCRAM.createChallenge("localhost");
    return "+ " + this._usedCRAMMD5Challenge;
  },
  authCRAMDigest : function (line)
  {
    var req = AuthCRAM.decodeLine(line);
    var expectedDigest = AuthCRAM.encodeCRAMMD5(
        this._usedCRAMMD5Challenge, this._daemon.kPassword);
    if (req.username == this._daemon.kUsername &&
        req.digest == expectedDigest) {
      this._state = kPop3StateTransaction;
      return "+OK Hello friend!";
    }
    else {
      if (this.dropOnAuthFailure)
        this.closing = true;
      return "-ERR Wrong username or password, crook!";
    }
  },

  authLOGINStart : function (lineRest)
  {
    this._nextAuthFunction = this.authLOGINUsername;
    this._multiline = true;

    return "+ " + btoa("Username:");
  },
  authLOGINUsername : function (line)
  {
    var req = AuthLOGIN.decodeLine(line);
    if (req == this._daemon.kUsername)
      this._nextAuthFunction = this.authLOGINPassword;
    else // Don't return error yet, to not reveal valid usernames
      this._nextAuthFunction = this.authLOGINBadUsername;
    this._multiline = true;
    return "+ " + btoa("Password:");
  },
  authLOGINBadUsername : function (line)
  {
    if (this.dropOnAuthFailure)
      this.closing = true;
    return "-ERR Wrong username or password, crook!";
  },
  authLOGINPassword : function (line)
  {
    var req = AuthLOGIN.decodeLine(line);
    if (req == this._daemon.kPassword) {
      this._state = kPop3StateTransaction;
      return "+OK Hello friend! Where did you pull out this old auth scheme?";
    }
    else {
      if (this.dropOnAuthFailure)
        this.closing = true;
      return "-ERR Wrong username or password, crook!";
    }
  },
};
