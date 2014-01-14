/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
// This file implements test SMTP servers

function smtpDaemon(deliverFunc) {
  this._deliverFunc = deliverFunc;
  this._messages = {};
}
smtpDaemon.prototype = {
}

///////////////////////////////////////////////////////////////////////////////
//                              SMTP TEST SERVERS                            //
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const kStateAuthNeeded = 0;
const kStateAuthOptional = 2;
const kStateAuthenticated = 3;

/**
 * This handler implements the bare minimum required by RFC 2821.
 * @see RFC 2821
 * If dropOnAuthFailure is set, the server will drop the connection
 * on authentication errors, to simulate servers that do the same.
 */
function SMTP_RFC2821_handler(daemon) {
  this._daemon = daemon;
  this.closing = false;
  this.dropOnAuthFailure = false;

  this._kAuthSchemeStartFunction = {};
  this._kAuthSchemeStartFunction["CRAM-MD5"] = this.authCRAMStart;
  this._kAuthSchemeStartFunction["PLAIN"] = this.authPLAINStart;
  this._kAuthSchemeStartFunction["LOGIN"] = this.authLOGINStart;

  this.resetTest();
}
SMTP_RFC2821_handler.prototype = {
  kAuthRequired : false,
  kUsername : "testsmtp",
  kPassword : "smtptest",
  kAuthSchemes : [ "CRAM-MD5", "PLAIN", "LOGIN" ],
  kCapabilities : [ "8BITMIME", "SIZE" ],
  _nextAuthFunction : undefined,

  resetTest : function() {
    this._state = this.kAuthRequired ? kStateAuthNeeded : kStateAuthOptional;
    this._nextAuthFunction = undefined;
    this._multiline = false;
    this.expectingData = false;
  },
  EHLO: function (args) {
    var capa = "250-fakeserver greets you";
    if (this.kCapabilities.length > 0)
      capa += "\n250-" + this.kCapabilities.join("\n250-");
    if (this.kAuthSchemes.length > 0)
      capa += "\n250-AUTH " + this.kAuthSchemes.join(" ");
    capa += "\n250 HELP"; // the odd one: no "-", per RFC 2821
    return capa;
  },
  AUTH: function (lineRest) {
    if (this._state == kStateAuthenticated)
      return "503 You're already authenticated";
    var args = lineRest.split(" ");
    var scheme = args[0].toUpperCase();
    // |scheme| contained in |kAuthSchemes|?
    if (!this.kAuthSchemes.some(function (s) { return s == scheme; }))
      return "504 AUTH " + scheme + " not supported";
    var func = this._kAuthSchemeStartFunction[scheme];
    if (!func || typeof(func) != "function")
      return "504 I just pretended to implement AUTH " + scheme + ", but I don't";
    return func.call(this, args[1]);
  },
  MAIL: function (args) {
    if (this._state == kStateAuthNeeded)
      return "530 5.7.0 Authentication required";
    return "250 ok";
  },
  RCPT: function(args) {
    if (this._state == kStateAuthNeeded)
      return "530 5.7.0 Authentication required";
    return "250 ok";
  },
  DATA: function(args) {
    if (this._state == kStateAuthNeeded)
      return "530 5.7.0 Authentication required";
    this.expectingData = true;
    this._daemon.post = "";
    return "354 ok\n";
  },
  RSET: function (args) {
    return "250 ok\n";
  },
  VRFY: function (args) {
    if (this._state == kStateAuthNeeded)
      return "530 5.7.0 Authentication required";
    return "250 ok\n";
  },
  EXPN: function (args) {
    return "250 ok\n";
  },
  HELP: function (args) {
    return "211 ok\n";
  },
  NOOP: function (args) {
    return "250 ok\n";
  },
  QUIT: function (args) {
    this.closing = true;
    return "221 done";
  },
  onStartup: function () {
    this.closing = false;
    return "220 ok";
  },

  /**
   * AUTH implementations
   * @see RFC 4954
   */
  authPLAINStart : function (lineRest)
  {
    if (lineRest) // all in one command, called initial client response, see RFC 4954
      return this.authPLAINCred(lineRest);

    this._nextAuthFunction = this.authPLAINCred;
    this._multiline = true;

    return "334 ";
  },
  authPLAINCred : function (line)
  {
    var req = AuthPLAIN.decodeLine(line);
    if (req.username == this.kUsername &&
        req.password == this.kPassword) {
      this._state = kStateAuthenticated;
      return "235 2.7.0 Hello friend! Friends give friends good advice: Next time, use CRAM-MD5";
    }
    else {
      if (this.dropOnAuthFailure)
        this.closing = true;
      return "535 5.7.8 Wrong username or password, crook!";
    }
  },

  authCRAMStart : function (lineRest)
  {
    this._nextAuthFunction = this.authCRAMDigest;
    this._multiline = true;

    this._usedCRAMMD5Challenge = AuthCRAM.createChallenge("localhost");
    return "334 " + this._usedCRAMMD5Challenge;
  },
  authCRAMDigest : function (line)
  {
    var req = AuthCRAM.decodeLine(line);
    var expectedDigest = AuthCRAM.encodeCRAMMD5(
        this._usedCRAMMD5Challenge, this.kPassword);
    if (req.username == this.kUsername &&
        req.digest == expectedDigest) {
      this._state = kStateAuthenticated;
      return "235 2.7.0 Hello friend!";
    }
    else {
      if (this.dropOnAuthFailure)
        this.closing = true;
      return "535 5.7.8 Wrong username or password, crook!";
    }
  },

  authLOGINStart : function (lineRest)
  {
    this._nextAuthFunction = this.authLOGINUsername;
    this._multiline = true;

    return "334 " + btoa("Username:");
  },
  authLOGINUsername : function (line)
  {
    var req = AuthLOGIN.decodeLine(line);
    if (req == this.kUsername)
      this._nextAuthFunction = this.authLOGINPassword;
    else // Don't return error yet, to not reveal valid usernames
      this._nextAuthFunction = this.authLOGINBadUsername;
    this._multiline = true;
    return "334 " + btoa("Password:");
  },
  authLOGINBadUsername : function (line)
  {
    if (this.dropOnAuthFailure)
      this.closing = true;
    return "535 5.7.8 Wrong username or password, crook!";
  },
  authLOGINPassword : function (line)
  {
    var req = AuthLOGIN.decodeLine(line);
    if (req == this.kPassword) {
      this._state = kStateAuthenticated;
      return "235 2.7.0 Hello friend! Where did you pull out this old auth scheme?";
    }
    else {
      if (this.dropOnAuthFailure)
        this.closing = true;
      return "535 5.7.8 Wrong username or password, crook!";
    }
  },

  onError: function (command, args) {
    return "500 Command " + command + " not recognized\n";
  },
  onServerFault: function (e) {
    return "451 Internal server error: " + e;
  },
  onMultiline: function(line) {
    if (this._nextAuthFunction) {
      var func = this._nextAuthFunction;
      this._multiline = false;
      this._nextAuthFunction = undefined;
      if (line == "*") { // abort, per RFC 4954 and others
        return "501 Okay, as you wish. Chicken";
      }
      if (!func || typeof(func) != "function") {
        return "451 I'm lost. Internal server error during auth";
      }
      try {
        return func.call(this, line);
      } catch (e) { return "451 " + e; }
    }
    if (line == ".") {
      if (this.expectingData) {
        this.expectingData = false;
        try {
          this._daemon._deliverFunc(this._daemon.post);
        }
        catch (ex) {
          return "451 Problem delivering message: " + ex + '    ' +
                   ex.stack.replace(/\n/g, '   ');
        }
        return "250 Wonderful article, your style is gorgeous!";
      }
      return "503 Huch? How did you get here?";
    }

    if (this.expectingData) {
      if (line.startsWith('.'))
        line = line.substring(1);
      // This uses CR LF to match with the specification
      this._daemon.post += line + '\r\n';
    }
    return undefined;
  },
  postCommand: function(reader) {
    if (this.closing)
      reader.closeSocket();
    reader.setMultiline(this._multiline || this.expectingData);
  }
}
