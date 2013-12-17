// This file implements test IMAP servers

////////////////////////////////////////////////////////////////////////////////
//                          IMAP DAEMON ORGANIZATION                          //
////////////////////////////////////////////////////////////////////////////////
// The large numbers of RFCs all induce some implicit assumptions as to the   //
// organization of an IMAP server. Ideally, we'd like to be as inclusive as   //
// possible so that we can guarantee that it works for every type of server.  //
// Unfortunately, such all-accepting setups make generic algorithms hard to   //
// use; given their difficulty in a generic framework, it seems unlikely that //
// a server would implement such characteristics. It also seems likely that   //
// if mailnews had a problem with the implementation, then most clients would //
// see similar problems, so as to make the server widely unusable. In any     //
// case, if someone complains about not working on bugzilla, it can be added  //
// to the test suite.                                                         //
// So, with that in mind, this is the basic layout of the daemon:             //
// DAEMON                                                                     //
// + Namespaces: parentless mailboxes whose names are the namespace name. The //
//     type of the namespace is specified by the type attribute.              //
// + Mailboxes: imapMailbox objects with several properties. If a mailbox     //
// | |   property begins with a '_', then it should not be serialized because //
// | |   it can be discovered from other means; in particular, a '_' does not //
// | |   necessarily mean that it is a private property that should not be    //
// | |   accessed. The parent of a top-level mailbox is null, not "".         //
// | + I18N names: RFC 3501 specifies a modified UTF-7 form for names.        //
// | |     However, a draft RFC makes the names UTF-8; it is expected to be   //
// | |     completed and implemented "soon". Therefore, the correct usage is  //
// | |     to specify the mailbox names as one normally does in JS and the    //
// | |     protocol will take care of conversion itself.                      //
// | + Case-sensitivity: RFC 3501 takes no position on this issue, only that  //
// | |     a case-insensitive server must treat the base-64 parts of mailbox  //
// | |     names as case-sensitive. The draft UTF8 RFC says nothing on this   //
// | |     topic, but Crispin recommends using Unicode case-insensitivity. We //
// | |     therefore treat names in such manner (if the case-insensitive flag //
// | |     is set), in technical violation of RFC 3501.                       //
// | + Flags: Flags are (as confirmed by Crispin) case-insensitive. Internal  //
// |       flag equality, though, uses case-sensitive checks. Therefore they  //
// |       should be normalized to a title-case form (e.g., \Noselect).       //
// + Synchronization: On certain synchronizing commands, the daemon will call //
// |   a synchronizing function to allow manipulating code the chance to      //
// |   perform various (potentially expensive) actions.                       //
// + Messages: A message is represented internally as an annotated URI.       //
////////////////////////////////////////////////////////////////////////////////

Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("resource://fakeserver/modules/mimeParser.jsm");

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                'Oct', 'Nov', 'Dec'];

// from (node-imap) imap.js
// XXX we could probably use toLocaleFormat instead, although I'm worried about
// running the tests under other (native) locales.
function formatImapDateTime(date) {
  var s;
  s = ((date.getDate() < 10) ? ' ' : '') + date.getDate() + '-' +
       MONTHS[date.getMonth()] + '-' +
       date.getFullYear() + ' ' +
       ('0'+date.getHours()).slice(-2) + ':' +
       ('0'+date.getMinutes()).slice(-2) + ':' +
       ('0'+date.getSeconds()).slice(-2) +
       ((date.getTimezoneOffset() > 0) ? ' -' : ' +' ) +
       ('0'+(Math.abs(date.getTimezoneOffset()) / 60)).slice(-2) +
       ('0'+(Math.abs(date.getTimezoneOffset()) % 60)).slice(-2);
  return s;
}

function imapDaemon(flags, syncFunc) {
  this._flags = flags;
  this._useNowTimestamp = null;

  this.namespaces = [];
  this.idResponse = "NIL";
  this.root = new imapMailbox("", null,
                              {
                                type : IMAP_NAMESPACE_PERSONAL,
                                flags: ['\\Noselect']
                              });
  this.uidvalidity = Math.round(Date.now()/1000);

  this.inbox = new imapMailbox("INBOX", null, this.uidvalidity++);
  this.root.addMailbox(this.inbox);
  this.drafts = new imapMailbox("Drafts", null, this.uidvalidity++);
  this.root.addMailbox(this.drafts);
  this.sent = new imapMailbox("Sent", null, this.uidvalidity++);
  this.root.addMailbox(this.sent);
  this.trash = new imapMailbox("Trash", null, this.uidvalidity++);
  this.root.addMailbox(this.trash);
  // Always create a 'Custom' folder that does not have special-use purposes
  // so that test code can infer that if they know about a 'Custom' folder then
  // they have synchronized the folder list.  If we only created special folders
  // then there would be a very real possibility a client might try and create
  // those folders locally, confusing the unit tests.
  // NOTE: It's arguable that maybe we should not be doing this in here as a
  // default and instead should leave it to our initializer.
  this.customFolder = new imapMailbox("Custom", null, this.uidvalidity++);
  // And let's mark the folder with a special-use flag that would never be
  // guessed from the name so we can see when special-use flags are properly
  // detected.
  this.customFolder.specialUseFlag = '\\Archive';
  this.root.addMailbox(this.customFolder);

  this.namespaces.push(this.root);
  this.syncFunc = syncFunc;
  // This can be used to cause the artificial failure of any given command.
  this.commandToFail = "";
  // This can be used to simulate timeouts on large copies
  this.copySleep = 0;

  // SEARCH date operations are impacted by the timezone in use on the server,
  // usually.  The spec actually calls for just looking at the date string and
  // ignoring the time part including the timezone.  That could result in
  // craziness; for efficiency it seems like most servers just apply a fixed
  // timezone offset based on the local time.
  //
  // This offset is the number of milliseconds behind (positive) or ahead of
  // (negative) UTC we are.  As such, if you want to transform an IMAP date,
  // from UTC midnight on the given date to your local midnight, you add this
  // offset to the UTC timestamp.
  this.tzOffsetMillis = new Date().getTimezoneOffset() * 60000;
}
imapDaemon.prototype = {
  _makeNowDate: function() {
    if (this._useNowTimestamp) {
      var ts = this._useNowTimestamp;
      this._useNowTimestamp += 1000;
      return new Date(ts);
    }
    return new Date();
  },

  synchronize : function (mailbox, update) {
    if (this.syncFunc)
      this.syncFunc.call(null, this);
    if (update) {
      for each (var message in mailbox._messages) {
        message.recent = false;
      }
    }
  },
  getNamespace : function (name) {
    for each (var namespace in this.namespaces) {
      if (name.indexOf(namespace.name) == 0 &&
          name[namespace.name.length] == namespace.delimiter)
        return namespace;
    }
    return this.root;
  },
  createNamespace : function (name, type) {
    var newbox = this.createMailbox(name, {type : type});
    this.namespaces.push(newbox);
  },
  getMailbox : function (name) {
    if (name == "")
      return this.root;
    // INBOX is case-insensitive, no matter what
    if (name.toUpperCase().startsWith("INBOX"))
      name = "INBOX" + name.substr(5);
    // We want to find a child who has the same name, but we don't quite know
    // what the delimiter is. The convention is that different namespaces use a
    // name starting with '#', so that's how we'll work it out.
    if (name.startsWith('#')) {
      var root = null;
      for each (var mailbox in this.root._children) {
        if (mailbox.name.indexOf(name) == 0 &&
            name[mailbox.name.length] == mailbox.delimiter) {
          root = mailbox;
          break;
        }
      }
      if (!mailbox)
        return null;

      // Now we continue like normal
      var names = name.split(mailbox.delimiter);
      names.splice(0, 1);
      for each (var part in names) {
        mailbox = mailbox.getChild(part);
        if (!mailbox || mailbox.nonExistent)
          return null;
      }
      return mailbox;
    } else {
      // This is easy, just split it up using the inbox's delimiter
      var names = name.split(this.inbox.delimiter);
      var mailbox = this.root;

      for each (var part in names) {
        mailbox = mailbox.getChild(part);
        if (!mailbox || mailbox.nonExistent)
          return null;
      }
      return mailbox;
    }
  },
  createMailbox : function (name, oldBox) {
    var namespace = this.getNamespace(name);
    if (namespace.name != "")
      name = name.substring(namespace.name.length+1);
    var prefixes = name.split(namespace.delimiter);
    if (prefixes[prefixes.length-1] == '')
      var subName = prefixes.splice(prefixes.length - 2, 2)[0];
    else
      var subName = prefixes.splice(prefixes.length - 1, 1)[0];
    var box = namespace;
    for each (var component in prefixes) {
      box = box.getChild(component);
      // Yes, we won't autocreate intermediary boxes
      if (box == null || box.flags.indexOf('\\NoInferiors') != -1)
        return false;
    }
    // If this is an imapMailbox...
    if (oldBox && oldBox._children) {
      // Only delete now so we don't screw ourselves up if creation fails
      this.deleteMailbox(oldBox);
      oldBox._parent = box == this.root ? null : box;
      let newBox = new imapMailbox(subName, box, this.uidvalidity++);
      newBox._messages = oldBox._messages;
      box.addMailbox(newBox);

      // And if oldBox is an INBOX, we need to recreate that
      if (oldBox.name == "INBOX") {
        this.inbox = new imapMailbox("INBOX", null, this.uidvalidity++);
        this.root.addMailbox(this.inbox);
      }
      oldBox.name = subName;
    } else if (oldBox) {
      // oldBox is a regular {} object, so it contains mailbox data but is not
      // a mailbox itself. Pass it into the constructor and let that deal with
      // it...
      var childBox = new imapMailbox(subName, box == this.root ? null : box,
                                     oldBox);
      box.addMailbox(childBox);
      // And return the new mailbox, since this is being used by people setting
      // up the daemon.
      return childBox;
    } else {
      var creatable = hasFlag(this._flags, IMAP_FLAG_NEEDS_DELIMITER) ?
                      name[name.length - 1] == namespace.delimiter :
                      true;
      var childBox = new imapMailbox(subName, box == this.root ? null : box,
        { flags : creatable ? [] : ['\\NoInferiors'],
          uidvalidity : this.uidvalidity++ });
      box.addMailbox(childBox);
    }
    return true;
  },
  deleteMailbox : function (mailbox) {
    if (mailbox._children.length == 0) {
      // We don't preserve the subscribed state for deleted mailboxes
      var parentBox = mailbox._parent == null ? this.root : mailbox._parent;
      parentBox._children.splice(parentBox._children.indexOf(mailbox), 1);
    } else {
      // clear mailbox
      mailbox._messages = [];
      mailbox.flags.push("\\Noselect");
    }
  },
  /**
   * Receive a message from the SMTP server.  For simplicity, we add the
   * 'Received' line ourselves.  We use a now-ish date for the date of
   * receipt and INTERNALDATE.
   */
  deliverMessage: function (msgStr) {
    var receiveDate = this._makeNowDate();
    var importStr =
        'Received: from 127.1.2.3 by 127.1.2.3; ' +
        formatImapDateTime(receiveDate) + '\r\n' +
        msgStr;

    // the APPEND method is in the handler, so we can't get at it...
    var inbox = this.getMailbox('INBOX');
    var msg = new imapMessage(importStr, inbox.uidnext++, []);
    msg.recent = true;
    msg.date = receiveDate;
    inbox.addMessage(msg);
  }
};

function imapMailbox(name, parent, state) {
  this.name = name;
  this._parent = parent;
  this._children = [];
  this._messages = [];
  this._updates = [];

  // Shorthand for uidvalidity
  if (typeof state == "number") {
    this.uidvalidity = state;
    state = {};
  }

  if (!state)
    state = {};

  for (var prop in state)
    this[prop] = state[prop];

  this.setDefault("subscribed", false);
  this.setDefault("nonExistent", false);
  this.setDefault("delimiter", "/");
  this.setDefault("flags", []);
  this.setDefault("specialUseFlag", "");
  this.setDefault("uidnext", 1);
  this.setDefault("msgflags", ["\\Seen", "\\Answered", "\\Flagged",
                               "\\Deleted", "\\Draft"]);
  this.setDefault("permflags", ["\\Seen", "\\Answered", "\\Flagged",
                                "\\Deleted", "\\Draft", "\\*"]);
}
imapMailbox.prototype = {
  setDefault : function(prop, def) {
    this[prop] = prop in this ? this[prop] : def;
  },
  addMailbox : function (mailbox) {
    this._children.push(mailbox);
  },
  getChild : function (name) {
    var equal;
    for each (var mailbox in this._children) {
      if (name == mailbox.name)
        return mailbox;
    }
    return null;
  },
  matchKids : function (pattern) {
    if (pattern == "")
      return this._parent ? this._parent.matchKids("") : [this];

    var portions = pattern.split(this.delimiter);
    var matching = [this];
    for each (var folder in portions) {
      if (folder.length == 0)
        continue;

      let generator = folder.indexOf("*") >= 0 ? "allChildren" : "_children";
      let possible = matching.reduce(function (arr, elem) {
        return arr.concat(elem[generator]);
      }, []);

      if (folder == '*' || folder == '%') {
        matching = possible;
        continue;
      }

      let parts = folder.split(/[*%]/).filter(function (str) {
          return str.length > 0;
      });
      matching = possible.filter(function (mailbox) {
        let index = 0, name = mailbox.fullName;
        for each (var part in parts) {
          index = name.indexOf(part, index);
          if (index == -1)
            return false;
        }
        return true;
      });
    }
    return matching;
  },
  get fullName () {
    return (this._parent ? this._parent.fullName + this.delimiter : "") +
           this.name;
  },
  get displayName() {
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.isInternal = true;
    converter.charset = "x-imap4-modified-utf7";
    return converter.ConvertFromUnicode(this.fullName.replace(
      /([\\"])/g, '\\$1')) + converter.Finish();
  },
  get allChildren() {
    return this._children.reduce(function (arr, elem) {
      return arr.concat(elem._allChildrenInternal);
    }, []);
  },
  get _allChildrenInternal() {
    return this._children.reduce(function (arr, elem) {
      return arr.concat(elem._allChildrenInternal);
    }, [this]);
  },
  addMessage : function (message) {
    this._messages.push(message);
    if (message.uid >= this.uidnext)
      this.uidnext = message.uid + 1;
    if (this._updates.indexOf("EXISTS") == -1)
      this._updates.push("EXISTS");
    if ("__highestuid" in this && message.uid > this.__highestuid)
      this.__highestuid = message.uid;
  },
  get _highestuid () {
    if ("__highestuid" in this)
      return this.__highestuid;
    var highest = 0;
    for each (var message in this._messages)
      if (message.uid > highest)
        highest = message.uid;
    this.__highestuid = highest;
    return highest;
  },
  expunge : function () {
    var response = "";
    for (var i = 0; i < this._messages.length; i++) {
      if (this._messages[i].flags.indexOf("\\Deleted") >= 0) {
        response += "* " + (i + 1) + " EXPUNGE\0";
        this._messages.splice(i--, 1);
      }
    }
    if (response.length > 0)
      delete this.__highestuid;
    return response;
  }
}

function imapMessage(str, uid, flags) {
  this._str = str;
  this.size = str.length;
  this.uid = uid;
  this.size = 0;
  this.flags = flags.concat(); // copy the array
  this.recent = false;
}
imapMessage.prototype = {
  setFlag : function (flag) {
   if (this.flags.indexOf(flag) == -1)
     this.flags.push(flag);
  },
  // This allows us to simulate servers that approximate the rfc822 size.
  setSize: function(size) {
    this.size = size;
  },
  clearFlag : function (flag) {
    let index;
    if ((index = this.flags.indexOf(flag)) != -1)
      this.flags.splice(index, 1);
  },
  getText : function (start, length) {
    if (!start)
      start = 0;
    if (!length)
      length = undefined;

    return this._str.substr(start, length);
  },

  get _partMap() {
    if (this.__partMap)
      return this.__partMap;
    var partMap = {};
    this.partCount = 0;
    var self = this;
    var emitter = {
      startPart: function imap_buildMap_startPart(partNum, headers) {
        if (partNum === '')
          partNum = '1$';
        self.partCount++;
        var imapPartNum = partNum.replace('$','');
        // If there are multiple imap parts that this represents, we'll
        // overwrite with the latest. This is what we want (most deeply nested).
        partMap[imapPartNum] = [partNum, headers];
      }
    };
    MimeParser.parseSync(this.getText(), emitter,
      {bodyformat: 'none', stripcontinuations: false});
    return this.__partMap = partMap;
  },
  getPartHeaders: function (partNum) {
    return this._partMap[partNum][1];
  },
  getHeader: function(headerName) {
    var headers = this._partMap['1'][1];
    headerName = headerName.toLowerCase();
    if (headers.has(headerName))
      return headers.get(headerName)[0];
    return null;
  },
  getPartBody: function (partNum) {
    // The part number situation is a little confusing to me right now.
    // Basically, it appears the parser is using libmime-style part numbers
    // which have an extra '1.' path element for the root versus IMAP part
    // numbers.  So the main idea is if there is more than one part number,
    // we check an extra '1.' on the front.  We need to do this because a
    // single part IMAP message's sole body has a path of '1', but the first
    // sub-part in a multi-part message like multipart/alternative has a path
    // of '1' as well.  If we don't transform that, we'll end up fetching the
    // whole multipart/alternative body, which is definitely not what we want.
    if (this.partCount > 1)
      partNum = '1.' + partNum;

    var body = '';
    var emitter = {
      deliverPartData: function (partNum, data) {
        body += data;
      }
    };
    var mimePartNum = this._partMap[partNum][0];
    MimeParser.parseSync(this.getText(), emitter,
      { pruneat: mimePartNum, bodyformat: 'raw'});
    return body;
  }
}
// IMAP FLAGS
// If you don't specify any flag, no flags are set.
/**
 * This flag represents whether or not the daemon is case-insensitive.
 */
const IMAP_FLAG_CASE_INSENSITIVE = 1;
/**
 * This flag represents whether or not CREATE hierarchies need a delimiter.
 *
 * If this flag is off, <tt>CREATE a<br />CREATE a/b</tt> fails where
 * <tt>CREATE a/<br />CREATE a/b</tt> would succeed (assuming the delimiter is
 * '/').
 */
const IMAP_FLAG_NEEDS_DELIMITER = 2;

function hasFlag(flags, flag) {
  return (flags & flag) == flag;
}

// IMAP Namespaces
const IMAP_NAMESPACE_PERSONAL = 0;
const IMAP_NAMESPACE_OTHER_USERS = 1;
const IMAP_NAMESPACE_SHARED = 2;

// IMAP server helpers
const IMAP_STATE_NOT_AUTHED = 0;
const IMAP_STATE_AUTHED = 1;
const IMAP_STATE_SELECTED = 2;

function parseCommand(text, partial) {
  if (partial) {
    var args = partial.args;
    var current = partial.current;
    var stack = partial.stack;
    current.push(partial.text);
  } else {
    var args = [];
    var current = args;
    var stack = [];
  }
  var atom = '';
  while (text.length > 0) {
    let c = text[0];

    if (c == '"') {
      let index = 1;
      let s = '';
      while (index < text.length && text[index] != '"') {
        if (text[index] == '\\') {
          index++;
          if (text[index] != '"' && text[index] != '\\')
            throw "Expected quoted character";
        }
        s += text[index++];
      }
      if (index == text.length)
        throw "Expected DQUOTE";
      current.push(s);
      text = text.substring(index+1);
      continue;
    } else if (c == '{') {
      let end = text.indexOf('}');
      if (end == -1)
        throw "Expected CLOSE_BRACKET";
      if (end+1 != text.length)
        throw "Expected CRLF";
      let length = parseInt(text.substring(1, end));
      let state = {};
      // Usable state
      throw { length : length, current : current, args : args, stack : stack,
              text : '' };
    } else if (c == '(') {
      stack.push(current);
      current = [];
    } else if (c == ')') {
      if (atom.length > 0) {
        current.push(atom);
        atom = '';
      }
      let hold = current;
      current = stack.pop();
      if (current == undefined)
        throw "Unexpected CLOSE_PAREN";
      current.push(hold);
    } else if (c == ' ') {
      if (atom.length > 0) {
        current.push(atom);
        atom = '';
      }
    } else if (text.toUpperCase().startsWith("NIL") &&
               (text.length == 3 || text[3] == ' ')) {
      current.push(null);
      text = text.substring(4);
      continue;
    } else {
      atom += c;
    }
    text = text.substring(1);
  }
  if (stack.length != 0)
    throw "Expected CLOSE_PAREN!";
  if (atom.length > 0)
    args.push(atom);
  return args;
}

function formatArg(argument, spec) {
  // Get NILs out of the way quickly
  var nilAccepted = false;
  if (spec.startsWith('n') && spec[1] != 'u') {
    spec = spec.substring(1);
    nilAccepted = true;
  }
  if (argument == null) {
    if (!nilAccepted)
      throw "Unexpected NIL!";

    return null;
  }

  // array!
  if (spec.startsWith('(')) {
    // typeof array is object. Don't ask me why.
    if (!Array.isArray(argument))
      throw "Expected list!";
    // Strip the '(' and ')'...
    spec = spec.substring(1, spec.length - 1);
    // ... and apply to the rest
    return argument.map(function (item) { return formatArg(item, spec); });
  }

  // or!
  var pipe = spec.indexOf('|');
  if (pipe > 0) {
    var first = spec.substring(0, pipe);
    try {
      return formatArg(argument, first);
    } catch (e) {
      return formatArg(argument, spec.substring(pipe + 1));
    }
  }

  // By now, we know that the input should be generated from an atom or string.
  if (typeof argument != "string")
    throw "Expected argument of type " + spec + "!";

  if (spec == "atom") {
    argument = argument.toUpperCase();
  } else if (spec == "mailbox") {
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.isInternal = true;
    converter.charset = "x-imap4-modified-utf7";
    argument = converter.ConvertToUnicode(argument);
  } else if (spec == "string") {
    // Do nothing
  } else if (spec == "flag") {
    argument = argument.toLowerCase();
    if (!('a' <= argument[0] && argument[0] <= 'z') &&
        !('A' <= argument[0] && argument[0] <= 'Z')) {
      argument = argument[0] + argument[1].toUpperCase() + argument.substr(2);
    } else {
      argument = argument[0].toUpperCase() + argument.substr(1);
    }
  } else if (spec == "number") {
    if (argument == parseInt(argument))
      argument = parseInt(argument);
  } else if (spec == "date") {
    if (!(/^\d{1,2}-[A-Z][a-z]{2}-\d{4}( \d{2}(:\d{2}){2} [+-]\d{4})?$/.test(
          argument)))
     throw "Expected date!";
    argument = new Date(Date.parse(argument.replace(/-(?!\d{4}$)/g, ' ')));
  } else {
    throw "Unknown spec " + spec;
  }

  return argument;
}

// used by RFC 5258 and GMail (labels)
function parseMailboxList(aList) {

  // strip enclosing parentheses
  if (aList.startsWith('(')) {
    aList = aList.substring(1, aList.length - 1);
  }
  let mailboxList = [];
  for (let i = 0; i < aList.length; i++) {
    // first, check for literals
    if (aList[i] == '{') {
      let endBracketPos = aList.indexOf('}', i);
      let literalLen = parseInt(aList.substring(i + 1, endBracketPos));
      // skip CRLF after '}'
      mailboxList.push(aList.substr(endBracketPos + 3, literalLen));
      i = endBracketPos + 3 + literalLen;
    }
    if (aList[i] == '"') {
      let endQuotePos = i + aList.substring(i).search(/[^\\]"/);
      mailboxList.push(aList.substring(i + 1, endQuotePos + 1)
                       .replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      i = endQuotePos + 2;
    }
    if (aList[i] != ' ') {
      let nextSpace = aList.indexOf(' ', i);
      if (nextSpace == -1) {
        mailboxList.push(aList.substring(i));
        i = aList.length;
      } else {
        mailboxList.push(aList.substring(i, nextSpace));
        i = nextSpace;
      }
    }
  }
  return mailboxList;
}

////////////////////////////////////////////////////////////////////////////////
//                              IMAP TEST SERVERS                             //
////////////////////////////////////////////////////////////////////////////////
// Because of IMAP and the LEMONADE RFCs, we have a myriad of different       //
// server configurations that we should ideally be supporting. We handle them //
// by defining a core RFC 3501 implementation and then have different server  //
// extensions subclass the server through functions below. However, we also   //
// provide standard configurations for best handling.                         //
// Configurations:                                                            //
// * Barebones RFC 3501                                                       //
// * Cyrus                                                                    //
// * UW IMAP                                                                  //
// * Courier                                                                  //
// * Exchange                                                                 //
// * Dovecot                                                                  //
// * Zimbra                                                                   //
// * GMail                                                                    //
// KNOWN DEVIATIONS FROM RFC 3501:                                            //
// + The autologout timer is 3 minutes, not 30 minutes. A test with a logout  //
//   of 30 minutes would take a very long time if it failed.                  //
// + SEARCH (except for UNDELETED) and STARTTLS are not supported,            //
//   nor is all of FETCH.                                                     //
// + Concurrent mailbox access is probably compliant with a rather liberal    //
//   implementation of RFC 3501, although probably not what one would expect, //
//   and certainly not what the Dovecot IMAP server tests expect.             //
////////////////////////////////////////////////////////////////////////////////

/* IMAP Fakeserver operates in a different manner than the rest of fakeserver
 * because of some differences in the protocol. Commands are dispatched through
 * onError, which parses the message into components. Like other fakeserver
 * implementations, the command property will be called, but this time with an
 * argument that is an array of data items instead of a string representing the
 * rest of the line.
 */
function IMAP_RFC3501_handler(daemon) {

  this.kAuthSchemes = []; // Added by RFC2195 extension. Test may modify as needed.
  this.kCapabilities = [/*"LOGINDISABLED", "STARTTLS",*/]; // Test may modify as needed.
  this.kUidCommands = ["FETCH", "STORE", "SEARCH", "COPY"];

  this._daemon = daemon;
  this.closing = false;
  this.dropOnStartTLS = false;
  // map: property = auth scheme {String}, value = start function on this obj
  this._kAuthSchemeStartFunction = {};

  this._enabledCommands = {
    // IMAP_STATE_NOT_AUTHED
    0: ['CAPABILITY', 'NOOP', 'LOGOUT', 'STARTTLS', 'AUTHENTICATE', 'LOGIN'],
    // IMAP_STATE_AUTHED
    1: ['CAPABILITY', 'NOOP', 'LOGOUT', 'SELECT', 'EXAMINE', 'CREATE', 'DELETE',
        'RENAME', 'SUBSCRIBE', 'UNSUBSCRIBE', 'LIST', 'LSUB', 'STATUS',
        'APPEND'],
    // IMAP_STATE_SELECTED
    2: ['CAPABILITY', 'NOOP', 'LOGOUT', 'SELECT', 'EXAMINE', 'CREATE', 'DELETE',
        'RENAME', 'SUBSCRIBE', 'UNSUBSCRIBE', 'LIST', 'LSUB', 'STATUS',
        'APPEND', 'CHECK', 'CLOSE', 'EXPUNGE', 'SEARCH', 'FETCH', 'STORE',
        'COPY', 'UID']
  };
  // Format explanation:
  // atom -> UPPERCASE
  // string -> don't touch!
  // mailbox -> Apply ->UTF16 transformation with case-insensitivity stuff
  // flag -> Titlecase (or \Titlecase, $Titlecase, etc.)
  // date -> Make it a JSDate object
  // number -> Make it a number, if possible
  // ( ) -> list, apply flags as specified
  // [ ] -> optional argument.
  // x|y -> either x or y format.
  // ... -> variable args, don't parse
  this._argFormat = {
    CAPABILITY : [],
    NOOP : [],
    LOGOUT : [],
    STARTTLS : [],
    AUTHENTICATE : ["atom", "..."],
    LOGIN : ["string", "string"],
    SELECT : ["mailbox"],
    EXAMINE : ["mailbox"],
    CREATE : ["mailbox"],
    DELETE : ["mailbox"],
    RENAME : ["mailbox", "mailbox"],
    SUBSCRIBE : ["mailbox"],
    UNSUBSCRIBE : ["mailbox"],
    LIST : ["mailbox", "mailbox"],
    LSUB : ["mailbox", "mailbox"],
    STATUS : ["mailbox", "(atom)"],
    APPEND : ["mailbox", "[(flag)]", "[date]", "string"],
    CHECK : [],
    CLOSE : [],
    EXPUNGE : [],
    SEARCH : ["atom", "..."],
    FETCH : ["number", "atom|(atom|(atom))"],
    STORE : ["number", "atom", "flag|(flag)"],
    COPY : ["number", "mailbox"],
    UID : ["atom", "..."]
  };

  this.resetTest();
}
IMAP_RFC3501_handler.prototype = {

  resetTest : function() {
    this._state = IMAP_STATE_NOT_AUTHED;
    this._multiline = false;
    this._nextAuthFunction = undefined; // should be in RFC2195_ext, but too lazy
  },
  onStartup : function () {
    this._state = IMAP_STATE_NOT_AUTHED;
    return "* OK IMAP4rev1 Fakeserver started up";
  },

  ////////////////////////////////////
  // CENTRALIZED DISPATCH FUNCTIONS //
  ////////////////////////////////////

  // IMAP sends commands in the form of "tag command args", but fakeserver
  // parsing tries to call the tag, which doesn't exist. Instead, we use this
  // error method to do the actual command dispatch. Mailnews uses numbers for
  // tags, which won't impede on actual commands.
  onError : function (tag, realLine) {
    this._tag = tag;
    var space = realLine.indexOf(" ");
    var command = space == -1 ? realLine : realLine.substring(0, space);
    realLine = space == -1 ? "" : realLine.substring(space+1);

    // Now parse realLine into an array of atoms, etc.
    try {
      var args = parseCommand(realLine);
    } catch (state if typeof state == "object") {
      this._partial = state;
      this._partial.command = command;
      this._multiline = true;
      return "+ More!";
    } catch (ex) {
      return this._tag + " BAD " + ex;
    }

    // If we're here, we have a command with arguments. Dispatch!
    return this._dispatchCommand(command, args);
  },
  onServerFault: function (e) {
    return this._tag + " BAD internal server error: " + e + ": " +
             e.stack.replace(/\n/g, '; ');
  },
  onMultiline : function (line) {
    // A multiline arising form a literal being passed
    if (this._partial) {
      // There are two cases to be concerned with:
      // 1. The CRLF is internal or end (we want more)
      // 1a. The next line is the actual command stuff!
      // 2. The CRLF is in the middle (rest of the line is args)
      if (this._partial.length >= line.length + 2) { // Case 1
        this._partial.text += line + '\r\n';
        this._partial.length -= line.length + 2;
        return undefined;
      } else if (this._partial.length != 0) {
        this._partial.text += line.substring(0, this._partial.length);
        line = line.substring(this._partial.length);
      }
      var command = this._partial.command;
      var args;
      try {
        args = parseCommand(line, this._partial);
      } catch (state if typeof state == "object") {
        // Yet another literal coming around...
        this._partial = state;
        this._partial.command = command;
        return "+ I'll be needing more text";
      } catch (ex) {
        this._multiline = false;
        return this.tag + " BAD parse error: " + ex;
      }

      this._partial = undefined;
      this._multiline = false;
      return this._dispatchCommand(command, args);
    }

    if (this._nextAuthFunction) {
      var func = this._nextAuthFunction;
      this._multiline = false;
      this._nextAuthFunction = undefined;
      if (line == "*") {
        return this._tag + " BAD Okay, as you wish. Chicken";
      }
      if (!func || typeof(func) != "function") {
        return this._tag + " BAD I'm lost. Internal server error during auth";
      }
      try {
        return this._tag + " " + func.call(this, line);
      } catch (e) { return this._tag + " BAD " + e; }
    }
    return undefined;
  },
  _dispatchCommand : function (command, args) {
    this.sendingLiteral = false;
    command = command.toUpperCase();
    if (command == this._daemon.commandToFail.toUpperCase())
      return this._tag + " NO " + command + " failed";
    if (command in this) {
      this._lastCommand = command;
      // Are we allowed to execute this command?
      if (this._enabledCommands[this._state].indexOf(command) == -1)
        return this._tag + " BAD illegal command for current state " + this._state;

      try {
        // Format the arguments nicely
        args = this._treatArgs(args, command);

      // UID command by itself is not useful for PerformTest
      if (command == "UID")
        this._lastCommand += " " + args[0];

        // Finally, run the thing
        var response = this[command](args);
      } catch (e if typeof e == "string") {
        var response = e;
      }
    } else {
      var response = "BAD " + command  + " not implemented";
    }

    // Add status updates
    if (this._selectedMailbox) {
      for each (var update in this._selectedMailbox._updates) {
        var line;
        switch (update) {
        case "EXISTS":
          line = "* " + this._selectedMailbox._messages.length + " EXISTS";
          break;
        }
        response = line + '\0' + response;
      }
    }

    var lines = response.split(/\u0000/);
    response = "";
    for each (var line in lines) {
      if (!line.startsWith('+') && !line.startsWith('*'))
        response += this._tag + " ";
      response += line + "\r\n";
    }
    return response;
  },
  _treatArgs : function (args, command) {
    var format = this._argFormat[command];
    var treatedArgs = [];
    for (var i = 0; i < format.length; i++) {
      var spec = format[i];

      if (spec == "...") {
        treatedArgs = treatedArgs.concat(args);
        args = [];
        break;
      }

      if (args.length == 0)
        if (spec.startsWith('[')) // == optional arg
          continue;
        else
          throw "BAD not enough arguments";

      if (spec.startsWith('[')) {
        // We have an optional argument. See if the format matches and move on
        // if it doesn't. Ideally, we'd rethink our decision if a later
        // application turns out to be wrong, but that's ugly to do
        // iteratively. Should any IMAP extension require it, we'll have to
        // come back and change this assumption, though.
        spec = spec.substr(1, spec.length - 2);
        try {
          var out = formatArg(args[0], spec);
        } catch (e) {
          continue;
        }
        treatedArgs.push(out);
        args.shift();
        continue;
      }
      try {
        treatedArgs.push(formatArg(args.shift(), spec));
      } catch (e) {
        throw "BAD " + e;
      }
    }
    if (args.length != 0)
      throw "BAD Too many arguments";
    return treatedArgs;
  },

  //////////////////////////
  //  PROTOCOL COMMANDS   //
  // (ordered as in spec) //
  //////////////////////////
  CAPABILITY : function (args) {
    var capa = "* CAPABILITY IMAP4rev1 " + this.kCapabilities.join(" ");
    if (this.kAuthSchemes.length > 0)
      capa += " AUTH=" + this.kAuthSchemes.join(" AUTH=");
    capa += "\0" + "OK CAPABILITY completed";
    return capa;
  },
  LOGOUT : function (args) {
    this.closing = true;
    if (this._selectedMailbox)
      this._daemon.synchronize(this._selectedMailbox, !this._readOnly);
    this._state = IMAP_STATE_NOT_AUTHED;
    return "* BYE IMAP4rev1 Logging out\0OK LOGOUT completed";
  },
  NOOP : function (args) {
    return "OK NOOP completed";
  },
  STARTTLS : function (args) {
    // simulate annoying server that drops connection on STARTTLS
    if (this.dropOnStartTLS) {
      this.closing = true;
      return "";
    }
    else
      return "BAD maild doesn't support TLS ATM";
  },
  _nextAuthFunction : undefined,
  AUTHENTICATE : function (args) {
    var scheme = args[0]; // already uppercased by type "atom"
    // |scheme| contained in |kAuthSchemes|?
    if (!this.kAuthSchemes.some(function (s) { return s == scheme; }))
      return "-ERR AUTH " + scheme + " not supported";

    var func = this._kAuthSchemeStartFunction[scheme];
    if (!func || typeof(func) != "function")
      return "BAD I just pretended to implement AUTH " + scheme + ", but I don't";
    return func.call(this, args[1]);
  },
  LOGIN : function (args) {
    if (this.kCapabilities.some(function(c) { return c == "LOGINDISABLED"; } ))
      return "BAD old-style LOGIN is disabled, use AUTHENTICATE";
    if (args[0] == this._daemon.kUsername &&
        args[1] == this._daemon.kPassword) {
      this._state = IMAP_STATE_AUTHED;
      return "OK authenticated";
    }
    else
      return "NO invalid password, I won't authenticate you";
  },
  SELECT : function (args) {
    var box = this._daemon.getMailbox(args[0]);
    if (!box)
      return "NO no such mailbox";

    if (this._selectedMailbox)
      this._daemon.synchronize(this._selectedMailbox, !this._readOnly);
    this._state = IMAP_STATE_SELECTED;
    this._selectedMailbox = box;
    this._readOnly = false;

    var response = "* FLAGS (" + box.msgflags.join(" ") + ")\0";
    response += "* " + box._messages.length + " EXISTS\0* ";
    response += box._messages.reduce(function (count, message) {
      return count + (message.recent ? 1 : 0);
    }, 0);
    response += " RECENT\0";
    for (var i = 0; i < box._messages.length; i++) {
      if (box._messages[i].flags.indexOf("\\Seen") == -1) {
        response += "* OK [UNSEEN " + (i + 1) + "]\0";
        break;
      }
    }
    response += "* OK [PERMANENTFLAGS (" + box.permflags.join(" ") + ")]\0";
    response += "* OK [UIDNEXT " + box.uidnext + "]\0";
    response += "* OK [UIDVALIDITY " + box.uidvalidity + "]\0";
    return response + "OK [READ-WRITE] SELECT completed";
  },
  EXAMINE : function (args) {
    var box = this._daemon.getMailbox(args[0]);
    if (!box)
      return "NO no such mailbox";

    if (this._selectedMailbox)
      this._daemon.synchronize(this._selectedMailbox, !this._readOnly);
    this._state = IMAP_STATE_SELECTED;
    this._selectedMailbox = box;
    this._readOnly = true;

    var response = "* FLAGS (" + box.msgflags.join(" ") + ")\0";
    response += "* " + box._messages.length + " EXISTS\0* ";
    response += box._messages.reduce(function (count, message) {
      return count + (message.recent ? 1 : 0);
    }, 0);
    response += " RECENT\0";
    for (var i = 0; i < box._messages.length; i++) {
      if (box._messages[i].flags.indexOf("\\Seen") == -1) {
        response += "* OK [UNSEEN " + (i + 1) + "]\0";
        break;
      }
    }
    response += "* OK [PERMANENTFLAGS (" + box.permflags.join(" ") + ")]\0";
    response += "* OK [UIDNEXT " + box.uidnext + "]\0";
    response += "* OK [UIDVALIDITY " + box.uidvalidity + "]\0";
    return response + "OK [READ-ONLY] EXAMINE completed";
  },
  CREATE : function (args) {
    if (this._daemon.getMailbox(args[0]))
      return "NO mailbox already exists";
    if (!this._daemon.createMailbox(args[0]))
      return "NO cannot create mailbox";
    return "OK CREATE completed";
  },
  DELETE : function (args) {
    var mbox = this._daemon.getMailbox(args[0]);
    if (!mbox || mbox.name == "")
      return "NO no such mailbox";
    if (mbox._children.length > 0) {
      for (let i = 0; i < mbox.flags.length; i++)
        if (mbox.flags[i] == "\\Noselect")
          return "NO cannot delete mailbox";
    }
    this._daemon.deleteMailbox(mbox);
    return "OK DELETE completed";
  },
  RENAME : function (args) {
    var mbox = this._daemon.getMailbox(args[0]);
    if (!mbox || mbox.name == "")
      return "NO no such mailbox";
    if (!this._daemon.createMailbox(args[1], mbox))
      return "NO cannot rename mailbox";
    return "OK RENAME completed";
  },
  SUBSCRIBE : function (args) {
    var mailbox = this._daemon.getMailbox(args[0]);
    if (!mailbox)
      return "NO error in subscribing";
    mailbox.subscribed = true;
    return "OK SUBSCRIBE completed";
  },
  UNSUBSCRIBE : function (args) {
    var mailbox = this._daemon.getMailbox(args[0]);
    if (mailbox)
      mailbox.subscribed = false;
    return "OK UNSUBSCRIBE completed";
  },
  LIST : function (args) {

    // even though this is the LIST function for RFC 3501, code for
    // LIST-EXTENDED (RFC 5258) is included here to keep things simple and
    // avoid duplication. We can get away with this because the _treatArgs
    // function filters out invalid args for servers that don't support
    // LIST-EXTENDED before they even get here.

    let listFunctionName = "_LIST";
    // check for optional list selection options argument used by LIST-EXTENDED
    // and other related RFCs
    if (args.length == 3 || (args.length > 3 && args[3] == "RETURN")) {
      let selectionOptions = args.shift();
      selectionOptions = selectionOptions.toString().split(' ');
      selectionOptions.sort();
      for each (let option in selectionOptions) {
        listFunctionName += "_" + option.replace(/-/g, "_");
      }
    }
    // check for optional list return options argument used by LIST-EXTENDED
    // and other related RFCs
    if ((args[2] == "RETURN") ||
        this.kCapabilities.indexOf("CHILDREN") >= 0) {
      listFunctionName += "_RETURN";
      let returnOptions = args[3] ? args[3].toString().split(' ') : [];
      if ((this.kCapabilities.indexOf("CHILDREN") >= 0) &&
          (returnOptions.indexOf("CHILDREN") == -1)) {
        returnOptions.push("CHILDREN");
      }
      returnOptions.sort();
      for each (let option in returnOptions) {
        listFunctionName += "_" + option.replace(/-/g, "_");
      }
    }
    if (!this[listFunctionName])
      return 'BAD unknown LIST request options';

    let base = this._daemon.getMailbox(args[0]);
    if (!base)
      return "NO no such mailbox";
    let requestedBoxes;
    // check for multiple mailbox patterns used by LIST-EXTENDED
    // and other related RFCs
    if (args[1].startsWith("(")) {
      requestedBoxes = parseMailboxList(args[1]);
    } else {
      requestedBoxes = [ args[1] ];
    }
    let response = "";
    for each (let requestedBox in requestedBoxes) {
      let people = base.matchKids(requestedBox);
      for each (let box in people) {
        response += this[listFunctionName](box);
      }
    }
    return response + "OK LIST completed";
  },
  // _LIST is the standard LIST command response
  _LIST : function (aBox) {
    if (aBox.nonExistent) {
      return "";
    }
    return '* LIST (' + aBox.flags.join(" ") + ') "' + aBox.delimiter +
           '" "' + aBox.displayName + '"\0';
  },
  LSUB : function (args) {
    var base = this._daemon.getMailbox(args[0]);
    if (!base)
      return "NO no such mailbox";
    var people = base.matchKids(args[1]);
    var response = "";
    for each (var box in people) {
      if (box.subscribed)
        response += '* LSUB () "' + box.delimiter +
                    '" "' + box.displayName + '"\0';
    }
    return response + "OK LSUB completed";
  },
  STATUS : function (args) {
    var box = this._daemon.getMailbox(args[0]);
    if (!box)
      return "NO no such mailbox exists";
    for (let i = 0; i < box.flags.length; i++)
      if (box.flags[i] == "\\Noselect")
        return "NO STATUS not allowed on Noselect folder";
    var parts = [];
    for each (var status in args[1]) {
      var line = status + " ";
      switch (status) {
      case "MESSAGES":
        line += box._messages.length;
        break;
      case "RECENT":
        line += box._messages.reduce(function (count, message) {
          return count + (message.recent ? 1 : 0);
        }, 0);
        break;
      case "UIDNEXT":
        line += box.uidnext;
        break;
      case "UIDVALIDITY":
        line += box.uidvalidity;
        break;
      case "UNSEEN":
        line += box._messages.reduce(function (count, message) {
          return count + (message.flags.indexOf('\\Seen') == -1 ? 1 : 0);
        }, 0);
        break;
      default:
        return "BAD unknown status flag: " + status;
      }
      parts.push(line);
    }
    return "* STATUS \"" + args[0] + "\" (" + parts.join(' ') +
           ")\0OK STATUS completed";
  },
  APPEND : function (args) {
    var mailbox = this._daemon.getMailbox(args[0]);
    if (!mailbox)
      return "NO [TRYCREATE] no such mailbox";
    if (args.length == 3) {
      if (args[1] instanceof Date) {
        var flags = [];
        var date = args[1];
      } else {
        var flags = args[1];
        var date = this._daemon._makeNowDate();
      }
      var text = args[2];
    } else if (args.length == 4) {
      var flags = args[1];
      var date = args[2];
      var text = args[3];
    } else {
      var flags = [];
      var date = this._daemon._makeNowDate();
      var text = args[1];
    }

    var msg = new imapMessage(text, mailbox.uidnext++, flags);
    msg.recent = true;
    msg.date = date;
    mailbox.addMessage(msg);
    return "OK APPEND complete";
  },
  CHECK : function (args) {
    this._daemon.synchronize(this._selectedMailbox, false);
    return "OK CHECK completed";
  },
  CLOSE : function (args) {
    this._selectedMailbox.expunge();
    this._daemon.synchronize(this._selectedMailbox, !this._readOnly);
    this._selectedMailbox = null;
    this._state = IMAP_STATE_AUTHED;
    return "OK CLOSE completed";
  },
  EXPUNGE : function (args) {
    // Will be either empty or LF-terminated already
    var response = this._selectedMailbox.expunge();
    this._daemon.synchronize(this._selectedMailbox);
    return response + "OK EXPUNGE completed";
  },
  /*
   * Supported: NO, BEFORE, DELETED, SINCE, UNDELETED
   */
  SEARCH : function (args, uid) {
    let iArg = 0, self = this;
    // parse the date and apply our timezone offset
    function parseDateArg() {
      let pieces = args[iArg++].split('-');
      var day = parseInt(pieces[0], 10),
          zeroMonth = MONTHS.indexOf(pieces[1]),
          year = parseInt(pieces[2], 10);
      return Date.UTC(year, zeroMonth, day) + self._daemon.tzOffsetMillis;
    }

    // We perform iterative filtering for the clauses in the search.  This is
    // not intended to be super fast.
    let messages = this._selectedMailbox._messages;
    while (iArg < args.length) {
      let invert = false, date;
      if (args[iArg] === 'NOT') {
        invert = true;
        iArg++;
      }
      switch (args[iArg++]) {
        // - flag checks
        case 'UNDELETED':
          invert = !invert;
        case 'DELETED':
          var wantDeleted = !invert;
          messages = messages.filter(function(msg) {
            var deleted = (msg.flags.indexOf('\\Deleted') !== -1);
            return deleted === wantDeleted;
          });
          break;
        // - date checks
        // XXX currently we won't invert correctly...
        case 'BEFORE':
          date = parseDateArg();
          messages = messages.filter(function(msg) {
            return msg.date.valueOf() < date;
          });
          break;
        case 'SINCE':
          date = parseDateArg();
          messages = messages.filter(function(msg) {
            return msg.date.valueOf() >= date;
          });
          break;
        // - UIDs
        case 'UID':
          messages = this._parseSequenceSet(args[iArg++], uid);
          break;

        default:
          return "BAD not here yet: " + args[iArg-1];
      }
    }
    let response = "* SEARCH";
    for (let i = 0; i < messages.length; i++) {
      if (uid)
        response += " " + messages[i].uid;
      else
        response += " " + (i + 1); // sequence numbers are 1-based
    }
    response += '\0';
    return response + "OK SEARCH COMPLETED";
  },
  FETCH : function (args, uid) {
    // Step 1: Get the messages to fetch
    var ids = [];
    var messages = this._parseSequenceSet(args[0], uid, ids);

    // Step 2: Ensure that the fetching items are in a neat format
    if (typeof args[1] == "string") {
      if (args[1] in this.fetchMacroExpansions)
        args[1] = this.fetchMacroExpansions[args[1]];
      else
        args[1] = [args[1]];
    }
    if (uid && args[1].indexOf("UID") == -1)
      args[1].push("UID");

    // Step 2.1: Preprocess the item fetch stack
    var items = [], prefix = undefined;
    for each (var item in args[1]) {
      if (item.indexOf('[') > 0 && item.indexOf(']') == -1) {
        // We want to append everything into an item until we find a ']'
        prefix = item + ' ';
        continue;
      }
      if (prefix !== undefined) {
        if (typeof item != "string" || item.indexOf(']') == -1) {
          prefix += (typeof item == "string" ? item : '(' + item.join(' ') + ')')
                  + ' ';
          continue;
        }
        // Replace superfluous space with a ' '
        prefix[prefix.length - 1] = ']';
        item = prefix;
        prefix = undefined;
      }
      item = item.toUpperCase();
      if (items.indexOf(item) == -1)
        items.push(item);
    }

    // Step 3: Fetch time!
    var response = "";
    for (var i = 0; i < messages.length; i++) {
      response += "* " + ids[i] + " FETCH (";
      var parts = [];
      for each (var item in items) {

        // Brief explanation: an item like BODY[]<> can't be hardcoded easily,
        // so we go for the initial alphanumeric substring, passing in the
        // actual string as an optional second part.
        var front = item.split(/[^A-Z0-9-]/, 1)[0];
        var functionName = "_FETCH_" + front.replace(/-/g, "_");

        if (!(functionName in this))
          return "BAD can't fetch " + front;
        try {
          parts.push(this[functionName](messages[i], item));
        } catch (ex) {

          return "BAD error in fetching: "+ex + ": " +
                   ex.stack.replace(/\n/g, '; ');
        }
      }
      response += parts.join(" ") + ')\0';
    }
    return response + "OK FETCH completed";
  },
  STORE : function (args, uid) {
    var ids = [];
    var messages = this._parseSequenceSet(args[0], uid, ids);

    args[1] = args[1].toUpperCase();
    var silent = args[1].contains('.SILENT', 1);
    if (silent)
      args[1] = args[1].substring(0, args[1].indexOf('.'));

    if (typeof args[2] != "object")
      args[2] = [args[2]];

    var response = "";
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      switch (args[1]) {
      case "FLAGS":
        message.flags = args[2];
        break;
      case "+FLAGS":
        for each (var flag in args[2])
          message.setFlag(flag);
        break;
      case "-FLAGS":
        for each (var flag in args[2]) {
          var index;
          if ((index = message.flags.indexOf(flag)) != -1)
            message.flags.splice(index, 1);
        }
        break;
      default:
        return "BAD change what now?";
      }
      response += "* " + ids[i] + " FETCH (FLAGS (";
      response += message.flags.join(' ');
      response += '))\0';
    }
    if (silent)
      response = "";
    return response + 'OK STORE completed';
  },
  COPY : function (args, uid) {
    var messages = this._parseSequenceSet(args[0], uid);

    var dest = this._daemon.getMailbox(args[1]);
    if (!dest)
      return "NO [TRYCREATE] what mailbox?";

    for each (var message in messages) {
      let newMessage = new imapMessage(message._str, dest.uidnext++,
                                       message.flags);
      newMessage.recent = false;
      newMessage.date = message.date;
      dest.addMessage(newMessage);
    }
    if (this._daemon.copySleep > 0) {
      // spin rudely for copyTimeout milliseconds.
      let now = new Date();
      let alarm;
      let startingMSeconds = now.getTime();
      while (true) {
        alarm = new Date();
        if (alarm.getTime() - startingMSeconds > this._daemon.copySleep)
          break;
      }
    }
    return "OK COPY completed";
  },
  UID : function (args) {
    var name = args.shift();
    if (this.kUidCommands.indexOf(name) == -1)
      return "BAD illegal command " + name;

    args = this._treatArgs(args, name);
    return this[name](args, true);
  },

  postCommand : function (reader) {
    if (this.closing) {
      this.closing = false;
      reader.closeSocket();
    }
    if (this.sendingLiteral)
      reader.preventLFMunge();
    reader.setMultiline(this._multiline);
    if (this._lastCommand == reader.watchWord)
      reader.stopTest();
  },
  onServerFault : function () {
    return ("_tag" in this ? this._tag : '*') + ' BAD Internal server fault.';
  },

  ////////////////////////////////////
  // FETCH sub commands and helpers //
  ////////////////////////////////////
  fetchMacroExpansions : {
    ALL: ["FLAGS", "INTERNALDATE", "RFC822.SIZE", /*"ENVELOPE"*/],
    FAST: ["FLAGS", "INTERNALDATE", "RFC822.SIZE"],
    FULL: ["FLAGS", "INTERNALDATE", "RFC822.SIZE", /*"ENVELOPE", "BODY"*/]
  },
  /**
   * Parses an IMAP UID/sequence string, `set`.  `uid` controls whether we are
   * using UIDs (true), or sequence numbers (false).  If `ids` is provided, it
   * should be a list and the UIDs/sequence numbers that get parsed out will be
   * pushed into it.
   *
   * A special mode of operation is supported where `set` can be a Number.
   */
  _parseSequenceSet : function (set, uid, ids /*optional*/) {
    if (typeof set == "number") {
      if (uid) {
        for (var i = 0; i < this._selectedMailbox._messages.length; i++) {
          var message = this._selectedMailbox._messages[i];
          if (message.uid == set) {
            if (ids)
              ids.push(i + 1);
            return [message];
          }
        }
        return [];
      } else {
        if (!(set - 1 in this._selectedMailbox._messages))
          return [];
        if (ids)
          ids.push(set);
        return [this._selectedMailbox._messages[set - 1]];
      }
    }

    var daemon = this;
    function part2num(part) {
      if (part == '*') {
        if (uid)
          return daemon._selectedMailbox._highestuid;
        else
          return daemon._selectedMailbox._messages.length;
      }
      let re = /[0-9]/g;
      let num = part.match(re);
      if(!num || (num.length != part.length))
        throw "BAD invalid UID " + part;
      return parseInt(part);
    }

    var elements = set.split(/,/);
    set = [];
    for each (var part in elements) {
      if (!part.contains(':')) {
        set.push(part2num(part));
      } else {
        var range = part.split(/:/);
        range[0] = part2num(range[0]);
        range[1] = part2num(range[1]);
        if (range[0] > range[1]) {
          let temp = range[1];
          range[1] = range[0];
          range[0] = temp;
        }
        for (let i = range[0]; i <= range[1]; i++)
          set.push(i);
      }
    }
    set.sort();
    for (var i = set.length - 1; i > 0; i--) {
      if (set[i] == set[i - 1])
        set.splice(i, 0);
    }

    if (!ids)
      ids = [];
    if (uid) {
      var messages = this._selectedMailbox._messages.filter(function (msg, i) {
        if (set.indexOf(msg.uid) == -1)
          return false;
        ids.push(i + 1);
        return true;
      });
    } else {
      var messages = [];
      for each (var id in set) {
        if (id - 1 in this._selectedMailbox._messages) {
          ids.push(id);
          messages.push(this._selectedMailbox._messages[id - 1]);
        }
      }
    }
    return messages;
  },
  _FETCH_BODY : function (message, query) {
    if (query == "BODY")
      return "BODYSTRUCTURE " + bodystructure(message.getText(), false);
    // parts = [ name, section, empty, {, partial, empty } ]
    var parts = query.split(/[[\]<>]/);

    if (parts[0] != "BODY.PEEK" && !this._readOnly)
      message.setFlag("\\Seen");

    if (parts[3])
      parts[3] = parts[3].split(/\./).map(
        function (e) { return parseInt(e, 10); });

    if (parts[1].length == 0) {
      // Easy case: we have BODY[], just send the message...
      var response = "BODY[]";
      if (parts[3]) {
        response += "<" + parts[3][0] + ">";
        var text = message.getText(parts[3][0], parts[3][1]);
      } else {
        var text = message.getText();
      }
      response += " {" + text.length + "}\r\n";
      response += text;
      return response;
    }

    // What's inside the command?
    var data = /((?:\d+\.)*\d+)(?:\.([^ ]+))?/.exec(parts[1]);
    if (data) {
      var partNum = data[1];
      query = data[2];
    } else {
      var partNum = "1";
      if (parts[1].contains(" ", 1))
        query = parts[1].substring(0, parts[1].indexOf(" "));
      else
        query = parts[1];
    }
    if (parts[1].contains(" ", 1))
      var queryArgs = parseCommand(parts[1].substr(parts[1].indexOf(" ")))[0];
    else
      var queryArgs = [];

    // Now we have three parameters representing the part number (empty for top-
    // level), the subportion representing what we want to find (empty for the
    // body), and an array of arguments if we have a subquery. If we made an
    // error here, it will pop until it gets to FETCH, which will just pop at a
    // BAD response, which is what should happen if the query is malformed.
    // Now we dump it all off onto imapMessage to mess with.

    // Start off the response
    var response = "BODY[" + parts[1] + "]";
    if (parts[3])
      response += "<" + parts[3][0] + ">";
    response += " ";

    var data = "";
    switch (query) {
    case "":
    case "TEXT":
    default:
      let bodyData = message.getPartBody(partNum);
      if (parts[3])
        data += bodyData.substr(parts[3][0], parts[3][1]);
      else
        data += bodyData;
      break;
    case "HEADER": // I believe this specifies mime for an RFC822 message only
      data += message.getPartHeaders(partNum).rawHeaderText + "\r\n";
      break;
    case "MIME":
      data += message.getPartHeaders(partNum).rawHeaderText + "\r\n\r\n";
      break;
    case "HEADER.FIELDS":
      var joinList = [];
      var headers = message.getPartHeaders(partNum);
      for (let header of queryArgs) {
        header = header.toLowerCase();
        if (headers.has(header))
          joinList.push([header + ": " + value
                         for (value of headers.get(header))].join('\r\n'));
      }
      data += joinList.join('\r\n') + "\r\n";
      break;
    case "HEADER.FIELDS.NOT":
      var joinList = [];
      var headers = message.getPartHeaders(partNum);
      for (let header of headers) {
        if (!(header in queryArgs))
          joinList.push([header + ": " + value
                         for (value of headers.get(header))].join('\r\n'));
      }
      data += joinList.join('\r\n') + "\r\n";
      break;
    }

    this.sendingLiteral = true;
    response += '{' + data.length + '}\r\n';
    response += data;
    return response;
  },
  _FETCH_BODYSTRUCTURE : function (message, query) {
    return "BODYSTRUCTURE " + bodystructure(message.getText(), true);
  },
  //_FETCH_ENVELOPE,
  _FETCH_FLAGS : function (message) {
    var response = "FLAGS (";
    response += message.flags.join(" ");
    if (message.recent)
      response += " \\Recent";
    response += ")";
    return response;
  },
  _FETCH_INTERNALDATE : function (message) {
    var response = "INTERNALDATE \"";
    response += formatImapDateTime(message.date);
    response += "\"";
    return response;
  },
  _FETCH_RFC822 : function (message, query) {
    if (query == "RFC822")
      return this._FETCH_BODY(message, "BODY[]").replace("BODY[]", "RFC822");
    if (query == "RFC822.HEADER")
      return this._FETCH_BODY(message, "BODY.PEEK[HEADER]")
                 .replace("BODY[HEADER]", "RFC822.HEADER");
    if (query == "RFC822.TEXT")
      return this._FETCH_BODY(message, "BODY[TEXT]")
                 .replace("BODY[TEXT]", "RFC822.TEXT");

    if (query == "RFC822.SIZE") {
      return "RFC822.SIZE " + message.size;
    } else {
      throw "Unknown item "+query;
    }
  },
  _FETCH_UID : function (message) {
    return "UID " + message.uid;
  }
}

////////////////////////////////////////////////////////////////////////////////
//                            IMAP4 RFC extensions                            //
////////////////////////////////////////////////////////////////////////////////
// Since there are so many extensions to IMAP, and since these extensions are //
// not strictly hierarchical (e.g., an RFC 2342-compliant server can also be  //
// RFC 3516-compliant, but a server might only implement one of them), they   //
// must be handled differently from other fakeserver implementations.         //
// An extension is defined as follows: it is an object (not a function and    //
// prototype pair!). This object is "mixed" into the handler via the helper   //
// function mixinExtension, which applies appropriate magic to make the       //
// handler compliant to the extension. Functions are added untransformed, but //
// both arrays and objects are handled by appending the values onto the       //
// original state of the handler. Semantics apply as for the base itself.     //
////////////////////////////////////////////////////////////////////////////////

// Note that UIDPLUS (RFC4315) should be mixed in last (or at least after the
// MOVE extension) because it changes behavior of that extension.
var configurations = {
  Cyrus: ["RFC2342", "RFC2195", "RFC5258"],
  UW: ["RFC2342", "RFC2195"],
  Dovecot: ["RFC2195", "RFC5258"],
  Zimbra: ["RFC2197", "RFC2342", "RFC2195", "RFC5258"],
  Exchange: ["RFC2342", "RFC2195"],
  LEMONADE: ["RFC2342", "RFC2195"],
  CUSTOM1: ["MOVE", "RFC4315", "CUSTOM"],
  GMail: ["GMAIL", "RFC2197", "RFC2342", "RFC3348", "RFC4315"]
};

function mixinExtension(handler, extension) {
  if (extension.preload)
    extension.preload(handler);

  for (var property in extension) {
    if (property == 'preload')
      continue;
    if (typeof extension[property] == "function") {
      // This is a function, so we add it to the handler
      handler[property] = extension[property];
    } else if (extension[property] instanceof Array) {
      // This is an array, so we append the values
      if (!(property in handler))
        handler[property] = [];
      handler[property] = handler[property].concat(extension[property]);
    } else {
      // This is an object, so we add in the values
      if (property in handler)
        // Hack to make arrays et al. work recursively
        mixinExtension(handler[property], extension[property]);
      else
        handler[property] = extension[property];
    }
  }
}

/**
 * Emulate the broken daum.net server which advertises SPECIAL-USE but screws
 * it up.
 *
 * Traces:
 *
 * ```
 * A02 CAPABILITY
 * CAPABILITY IMAP4rev1 LITERAL+ NAMESPACE UIDPLUS SPECIAL-USE
 * A02 OK CAPABILITY completed
 * ```
 *
 * ```
 * A05 LIST "" "*" RETURN (SPECIAL-USE)
 * LIST (\Noinferiors \HasNoChildren) "/" "__Daum_SpecialUse_Mailbox_All"
 * LIST (\Noinferiors \HasNoChildren) "/" "__Daum_SpecialUse_Mailbox_Unread"
 * LIST (\Noinferiors \HasNoChildren) "/" "__Daum_SpecialUse_Mailbox_Attached"
 * LIST (\Noinferiors \HasNoChildren) "/" "__Daum_SpecialUse_Mailbox_Important"
 * A05 OK LIST completed
 * ```
 *
 * ```
 * A04 LIST "" "*"
 * LIST (\Noinferiors \HasNoChildren) "/" "Inbox"
 * LIST (\Noinferiors \HasNoChildren) "/" "Sent Messages"
 * LIST (\Noinferiors \HasNoChildren) "/" "Drafts"
 * LIST (\Noinferiors \HasNoChildren) "/" "&wqTTONO4ycDVaA-"
 * LIST (\Noinferiors \HasNoChildren) "/" "Deleted Messages"
 * LIST (\Noinferiors \HasNoChildren) "/" "&sLSsjMT007jJwNVo-"
 * LIST (\Noinferiors \HasNoChildren) "/" "Outbox"
 * LIST (\Noinferiors \HasNoChildren) "/" "Temp"
 * LIST (\Noinferiors \HasNoChildren) "/" "&vPSwvNO4ycDVaA-"
 * LIST (\Noinferiors \HasNoChildren) "/" "SYCT"
 * A04 OK LIST completed
 * ```
 */
var IMAP_bad_special_use_extension = {
  kCapabilities: ["SPECIAL-USE"],

  preload: function (toBeThis) {
    // (SPECIAL-USE uses the same syntax as LIST-EXTENDED)
    toBeThis._argFormat.LIST = ["[(atom)]", "mailbox", "mailbox|(mailbox)",
                                "[atom]", "[(atom)]"];
    toBeThis._real_LIST = toBeThis.LIST;
  },

  LIST: function(args) {
    // Use the default LIST implementation if this isn't SPECIAL-USE magic.
    let idxReturn = args.indexOf('RETURN');
    if (idxReturn === -1)
      return this._real_LIST(args);
    let returnOptions = args[3] ? args[3].toString().split(' ') : [];
    if (returnOptions.indexOf('SPECIAL-USE') === -1)
      return this._real_LIST(args);

    let listFunctionName = "_LIST";

    let commonFlags = ['\\Noinferiors', '\\HasNoChildren'];
    let fakeBoxes = [
      {
        flags: commonFlags,
        delimiter: '/',
        displayName: '__Bad_SpecialUse_Mailbox_All',
      },
      {
        flags: commonFlags,
        delimiter: '/',
        displayName: '__Bad_SpecialUse_Mailbox_Unread',
      },
      {
        flags: commonFlags,
        delimiter: '/',
        displayName: '__Bad_SpecialUse_Mailbox_Attached',
      },
      {
        flags: commonFlags,
        delimiter: '/',
        displayName: '__Bad_SpecialUse_Mailbox_Important',
      },
    ];

    let response = "";
    fakeBoxes.forEach(function(box) {
      response += this[listFunctionName](box);
    }.bind(this));
    return response + "OK LIST completed";
  },
};

/**
 * SPECIAL-USE: http://tools.ietf.org/html/rfc6154
 *
 * XXX implement CREATE-SPECIAL-USE
 *
 * LIST already implements support for SPECIAL-USE
 */
var IMAP_RFC6154_extension = {
  kCapabilities: ["SPECIAL-USE"],

  preload: function (toBeThis) {
    // (SPECIAL-USE uses the same syntax as LIST-EXTENDED)
    toBeThis._argFormat.LIST = ["[(atom)]", "mailbox", "mailbox|(mailbox)",
                                "[atom]", "[(atom)]"];
  },

  _LIST_RETURN_SPECIAL_USE : function (aBox) {
    if (aBox.nonExistent) {
      return "";
    }
    return '* LIST (' + aBox.flags.join(" ") +
           ((aBox.specialUseFlag && aBox.specialUseFlag.length > 0) ?
            (' ' + aBox.specialUseFlag) : '') +
           ') "' + aBox.delimiter +
           '" "' + aBox.displayName + '"\0';
  },

  _LIST_RETURN_CHILDREN_SPECIAL_USE : function (aBox) {
    if (aBox.nonExistent) {
      return "";
    }
    return '* LIST (' + aBox.flags.join(" ") +
           ((aBox._children.length > 0) ?
            (((aBox.flags.length > 0) ? ' ' : '') + '\\HasChildren') :
            ((aBox.flags.indexOf('\\NoInferiors') == -1) ?
             (((aBox.flags.length > 0) ? ' ' : '') + '\\HasNoChildren') :
             '')) +
           ((aBox.specialUseFlag && aBox.specialUseFlag.length > 0) ?
            (' ' + aBox.specialUseFlag) : '') +
           ') "' + aBox.delimiter +
           '" "' + aBox.displayName + '"\0';
  },
};

// Support for Gmail extensions: XLIST and X-GM-EXT-1
var IMAP_GMAIL_extension = {
  preload: function (toBeThis) {
    toBeThis._preGMAIL_STORE = toBeThis.STORE;
    toBeThis._preGMAIL_STORE_argFormat = toBeThis._argFormat.STORE;
    toBeThis._argFormat.STORE = ["number", "atom", "..."];
  },
  XLIST : function (args) {
    // XLIST is really just SPECIAL-USE that does not conform to RFC 6154
    args.push("RETURN");
    args.push("SPECIAL-USE");
    return this.LIST(args);
  },
  // these get wrapped in functions for ordering independence
  _LIST_RETURN_CHILDREN : function (aBox) {
    return IMAP_RFC5258_extension._LIST_RETURN_CHILDREN(aBox);
  },
  _LIST_RETURN_CHILDREN_SPECIAL_USE : function (aBox) {
    return IMAP_RFC6154_extension._LIST_RETURN_CHILDREN_SPECIAL_USE(aBox);
  },
  STORE : function (args, uid) {
    let regex = /[+-]?FLAGS.*/;
    if (regex.test(args[1])) {
      // if we are storing flags, use the method that was overridden
      this._argFormat = this._preGMAIL_STORE_argFormat;
      args = this._treatArgs(args, "STORE");
      return this._preGMAIL_STORE(args, uid);
    }
    // otherwise, handle gmail specific cases
    let ids = [];
    let messages = this._parseSequenceSet(args[0], uid, ids);
    args[2] = formatArg(args[2], "string|(string)");
    for (let i = 0; i < args[2].length; i++) {
      if (args[2][i].indexOf(' ') > -1) {
        args[2][i] = '"' + args[2][i] + '"';
      }
    }
    let response = "";
    for (let i = 0; i < messages.length; i++) {
      let message = messages[i];
      switch (args[1]) {
      case "X-GM-LABELS":
        if (message.xGmLabels) {
          message.xGmLabels = args[2];
        } else {
          return "BAD can't store X-GM-LABELS";
        }
        break;
      case "+X-GM-LABELS":
        if (message.xGmLabels) {
          message.xGmLabels = message.xGmLabels.concat(args[2]);
        } else {
          return "BAD can't store X-GM-LABELS";
        }
        break;
      case "-X-GM-LABELS":
        if (message.xGmLabels) {
          for (let i = 0; i < args[2].length; i++) {
            let idx = message.xGmLabels.indexOf(args[2][i]);
            if (idx != -1) {
              message.xGmLabels.splice(idx,1);
            }
          }
        } else {
          return "BAD can't store X-GM-LABELS";
        }
        break;
      default:
        return "BAD change what now?";
      }
      response += "* " + ids[i] + " FETCH (X-GM-LABELS (";
      response += message.xGmLabels.join(' ');
      response += '))\0';
    }
    return response + 'OK STORE completed';
  },
  _FETCH_X_GM_MSGID : function (message) {
    if (message.xGmMsgid) {
        return "X-GM-MSGID " + message.xGmMsgid;
    } else {
        return "BAD can't fetch X-GM-MSGID";
    }
  },
  _FETCH_X_GM_THRID : function (message) {
    if (message.xGmThrid) {
        return "X-GM-THRID " + message.xGmThrid;
    } else {
        return "BAD can't fetch X-GM-THRID";
    }
  },
  _FETCH_X_GM_LABELS : function (message) {
    if (message.xGmLabels) {
        return "X-GM-LABELS " + message.xGmLabels;
    } else {
        return "BAD can't fetch X-GM-LABELS";
    }
  },
  kCapabilities: ["XLIST", "X-GM-EXT-1"],
  _argFormat : { XLIST : ["mailbox", "mailbox"] },
  // Enabled in AUTHED and SELECTED states
  _enabledCommands : { 1 : ["XLIST"], 2 : ["XLIST"] }
};

var IMAP_MOVE_extension = {
  MOVE: function (args, uid) {
    let messages = this._parseSequenceSet(args[0], uid);

    let dest = this._daemon.getMailbox(args[1]);
    if (!dest)
      return "NO [TRYCREATE] what mailbox?";

    for each (var message in messages) {
      let newMessage = new imapMessage(message._str, dest.uidnext++,
                                       message.flags);
      newMessage.recent = false;
      newMessage.date = message.date;
      dest.addMessage(newMessage);
    }
    let mailbox = this._selectedMailbox;
    let response = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      let msgIndex = mailbox._messages.indexOf(messages[i]);
      if (msgIndex != -1) {
        response += "* " + (msgIndex + 1) + " EXPUNGE\0";
        mailbox._messages.splice(msgIndex, 1);
      }
    }
    if (response.length > 0)
      delete mailbox.__highestuid;

    return response + "OK MOVE completed";
  },
  kCapabilities: ["MOVE"],
  kUidCommands: ["MOVE"],
  _argFormat: { MOVE: ["number", "mailbox"] },
  // Enabled in SELECTED state
  _enabledCommands: { 2: ["MOVE"] }
};

// Provides methods for testing fetchCustomAttribute and issueCustomCommand
var IMAP_CUSTOM_extension = {
  preload: function (toBeThis) {
    toBeThis._preCUSTOM_STORE = toBeThis.STORE;
    toBeThis._preCUSTOM_STORE_argFormat = toBeThis._argFormat.STORE;
    toBeThis._argFormat.STORE = ["number", "atom", "..."];
  },
  STORE : function (args, uid) {
    let regex = /[+-]?FLAGS.*/;
    if (regex.test(args[1])) {
      // if we are storing flags, use the method that was overridden
      this._argFormat = this._preCUSTOM_STORE_argFormat;
      args = this._treatArgs(args, "STORE");
      return this._preCUSTOM_STORE(args, uid);
    }
    // otherwise, handle custom attribute
    let ids = [];
    let messages = this._parseSequenceSet(args[0], uid, ids);
    args[2] = formatArg(args[2], "string|(string)");
    for (let i = 0; i < args[2].length; i++) {
      if (args[2][i].indexOf(' ') > -1) {
        args[2][i] = '"' + args[2][i] + '"';
      }
    }
    let response = "";
    for (let i = 0; i < messages.length; i++) {
      let message = messages[i];
      switch (args[1]) {
      case "X-CUSTOM-VALUE":
        if (message.xCustomValue && args[2].length == 1) {
          message.xCustomValue = args[2][0];
        } else {
          return "BAD can't store X-CUSTOM-VALUE";
        }
        break;
      case "X-CUSTOM-LIST":
        if (message.xCustomList) {
          message.xCustomList = args[2];
        } else {
          return "BAD can't store X-CUSTOM-LIST";
        }
        break;
      case "+X-CUSTOM-LIST":
        if (message.xCustomList) {
          message.xCustomList = message.xCustomList.concat(args[2]);
        } else {
          return "BAD can't store X-CUSTOM-LIST";
        }
        break;
      case "-X-CUSTOM-LIST":
        if (message.xCustomList) {
          for (let i = 0; i < args[2].length; i++) {
            let idx = message.xCustomList.indexOf(args[2][i]);
            if (idx != -1) {
              message.xCustomList.splice(idx,1);
            }
          }
        } else {
          return "BAD can't store X-CUSTOM-LIST";
        }
        break;
      default:
        return "BAD change what now?";
      }
      response += "* " + ids[i] + " FETCH (X-CUSTOM-LIST (";
      response += message.xCustomList.join(' ');
      response += '))\0';
    }
    return response + 'OK STORE completed';
  },
  _FETCH_X_CUSTOM_VALUE : function (message) {
    if (message.xCustomValue) {
        return "X-CUSTOM-VALUE " + message.xCustomValue;
    } else {
        return "BAD can't fetch X-CUSTOM-VALUE";
    }
  },
  _FETCH_X_CUSTOM_LIST : function (message) {
    if (message.xCustomList) {
        return "X-CUSTOM-LIST (" + message.xCustomList.join(' ') + ")";
    } else {
        return "BAD can't fetch X-CUSTOM-LIST";
    }
  },
  kCapabilities: ["X-CUSTOM1"]
};

// RFC 2197: ID
var IMAP_RFC2197_extension = {
  ID : function (args) {
    let clientID = "(";
    for each (let i in args)
      clientID += "\"" + i + "\"";

    clientID += ")";
    let clientStrings = clientID.split(",");
    clientID = "";
    for each (let i in clientStrings)
      clientID += "\"" + i + "\" "
    clientID = clientID.slice(1, clientID.length - 3);
    clientID += ")";
    this._daemon.clientID = clientID;
    return "* ID " + this._daemon.idResponse + "\0OK Success";
  },
  kCapabilities: ["ID"],
  _argFormat: { ID: ["(string)"] },
  _enabledCommands : { 1 : ["ID"], 2 : ["ID"] }
};

// RFC 2342: IMAP4 Namespace (NAMESPACE)
var IMAP_RFC2342_extension = {
  NAMESPACE : function (args) {
    var namespaces = [[], [], []];
    for each (var namespace in this._daemon.namespaces)
      namespaces[namespace.type].push(namespace);

    var response = "* NAMESPACE";
    for each (var type in namespaces) {
      if (type.length == 0) {
        response += " NIL";
        continue;
      }
      response += " (";
      for each (var namespace in type) {
        response += "(\"";
        response += namespace.displayName;
        response += "\" \"";
        response += namespace.delimiter;
        response += "\")";
      }
      response += ")";
    }
    response += "\0OK NAMESPACE command completed";
    return response;
  },
  kCapabilities : ["NAMESPACE"],
  _argFormat : { NAMESPACE : [] },
  // Enabled in AUTHED and SELECTED states
  _enabledCommands : { 1 : ["NAMESPACE"], 2 : ["NAMESPACE"] }
};

// RFC 3348 Child Mailbox (CHILDREN)
var IMAP_RFC3348_extension = {
  kCapabilities: ["CHILDREN"]
}

// RFC 4315: UIDPLUS
var IMAP_RFC4315_extension = {
  preload: function (toBeThis) {
    toBeThis._preRFC4315UID = toBeThis.UID;
    toBeThis._preRFC4315APPEND = toBeThis.APPEND;
    toBeThis._preRFC4315COPY = toBeThis.COPY;
    toBeThis._preRFC4315MOVE = toBeThis.MOVE;
  },
  UID: function (args) {
    // XXX: UID EXPUNGE is not supported.
    return this._preRFC4315UID(args);
  },
  APPEND: function (args) {
    let response = this._preRFC4315APPEND(args);
    if (response.indexOf("OK") == 0) {
      let mailbox = this._daemon.getMailbox(args[0]);
      let uid = mailbox.uidnext - 1;
      response = "OK [APPENDUID " + mailbox.uidvalidity + " " + uid + "]" +
                   response.substring(2);
    }
    return response;
  },
  COPY: function (args) {
    let mailbox = this._daemon.getMailbox(args[0]);
    if (mailbox)
      var first = mailbox.uidnext;
    let response = this._preRFC4315COPY(args);
    if (response.indexOf("OK") == 0) {
      let last = mailbox.uidnext - 1;
      response = "OK [COPYUID " + this._selectedMailbox.uidvalidity +
                   " " + args[0] + " " + first + ":" + last + "]" +
                   response.substring(2);
    }
    return response;
  },
  MOVE: function (args) {
    let mailbox = this._daemon.getMailbox(args[1]);
    if (mailbox)
      var first = mailbox.uidnext;
    let response = this._preRFC4315MOVE(args);
    if (response.indexOf("OK MOVE") != -1) {
      let last = mailbox.uidnext - 1;
      response =
        response.replace("OK MOVE",
                         "OK [COPYUID " + this._selectedMailbox.uidvalidity +
                            " " + args[0] + " " + first + ":" + last + "]",
                         "");
    }
    return response;
  },
  kCapabilities: ["UIDPLUS"]
};

// RFC 5258: LIST-EXTENDED
var IMAP_RFC5258_extension = {
  preload: function (toBeThis) {
    toBeThis._argFormat.LIST = ["[(atom)]", "mailbox", "mailbox|(mailbox)",
                                "[atom]", "[(atom)]"];
  },
  _LIST_SUBSCRIBED : function (aBox) {
    if (!aBox.subscribed) {
      return "";
    }
    return '* LIST (' + aBox.flags.join(" ") +
           ((aBox.flags.length > 0) ? ' ' : '') + '\\Subscribed' +
           (aBox.nonExistent ? ' \\NonExistent' : '') + ') "' +
           aBox.delimiter + '" "' + aBox.displayName + '"\0';
  },
  _LIST_RETURN_CHILDREN : function (aBox) {
    if (aBox.nonExistent) {
      return "";
    }
    return '* LIST (' + aBox.flags.join(" ") +
           ((aBox._children.length > 0) ?
            (((aBox.flags.length > 0) ? ' ' : '') + '\\HasChildren') :
            ((aBox.flags.indexOf('\\NoInferiors') == -1) ?
             (((aBox.flags.length > 0) ? ' ' : '') + '\\HasNoChildren') :
             '')) + ') "' + aBox.delimiter + '" "' + aBox.displayName + '"\0';
  },
  _LIST_RETURN_SUBSCRIBED : function (aBox) {
    if (aBox.nonExistent) {
      return "";
    }
    return '* LIST (' + aBox.flags.join(" ") +
           (aBox.subscribed ? (((aBox.flags.length > 0) ? ' ' : '') +
                               '\\Subscribed') : '') +
           ') "' + aBox.delimiter + '" "' + aBox.displayName + '"\0';
  },
  // TODO implement _LIST_REMOTE, _LIST_RECURSIVEMATCH, _LIST_RETURN_SUBSCRIBED
  // and all valid combinations thereof. Currently, nsImapServerResponseParser
  // does not support any of these responses anyway.

  kCapabilities: ["LIST-EXTENDED"]
};

/**
 * This implements AUTH schemes. Could be moved into RFC3501 actually.
 * The test can en-/disable auth schemes by modifying kAuthSchemes.
 */
var IMAP_RFC2195_extension = {
  kAuthSchemes : [ "CRAM-MD5" , "PLAIN", "LOGIN" ],

  preload: function (handler) {
    handler._kAuthSchemeStartFunction["CRAM-MD5"] = this.authCRAMStart;
    handler._kAuthSchemeStartFunction["PLAIN"] = this.authPLAINStart;
    handler._kAuthSchemeStartFunction["LOGIN"] = this.authLOGINStart;
  },

  authPLAINStart : function (lineRest)
  {
    this._nextAuthFunction = this.authPLAINCred;
    this._multiline = true;

    return "+";
  },
  authPLAINCred : function (line)
  {
    var req = AuthPLAIN.decodeLine(line);
    if (req.username == this._daemon.kUsername &&
        req.password == this._daemon.kPassword) {
      this._state = IMAP_STATE_AUTHED;
      return "OK Hello friend! Friends give friends good advice: Next time, use CRAM-MD5";
    }
    else {
      return "BAD Wrong username or password, crook!";
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
        this._usedCRAMMD5Challenge, this.kPassword);
    if (req.username == this._daemon.kUsername &&
        req.digest == expectedDigest) {
      this._state = IMAP_STATE_AUTHED;
      return "OK Hello friend!";
    }
    else {
      return "BAD Wrong username or password, crook!";
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
    return "BAD Wrong username or password, crook!";
  },
  authLOGINPassword : function (line)
  {
    var req = AuthLOGIN.decodeLine(line);
    if (req == this._daemon.kPassword) {
      this._state = IMAP_STATE_AUTHED;
      return "OK Hello friend! Where did you pull out this old auth scheme?";
    }
    else {
      return "BAD Wrong username or password, crook!";
    }
  },
};

// FETCH BODYSTRUCTURE
function bodystructure(msg, extension) {
  if (!msg || msg == "")
    return "";

  // Use the mime parser emitter to generate body structure data. Most of the
  // string will be built as we exit a part. Currently not working:
  // 1. Some of the fields return NIL instead of trying to calculate them.
  // 2. MESSAGE is missing the ENVELOPE and the lines at the end.
  var bodystruct = '';
  function paramToString(params) {
    let paramList = [];
    for (var param in params)
      paramList.push('"' + param.toUpperCase() + '" "' + params[param] + '"');
    return paramList.length == 0 ? 'NIL' : '(' + paramList.join(' ') + ')';
  }
  var headerStack = [];
  var BodyStructureEmitter = {
    startPart: function bodystructure_startPart(partNum, headers) {
      bodystruct += '(';
      headerStack.push(headers);
      this.numLines = 0;
      this.length = 0;
    },
    deliverPartData: function bodystructure_deliverPartData(partNum, data) {
      this.length += data.length;
      this.numLines += [x for each (x in data) if (x == '\n')].length;
    },
    endPart: function bodystructure_endPart(partNum) {
      // Grab the headers from before
      let headers = headerStack.pop();
      let contentType = headers.has('content-type') ?
        headers.get('content-type')[0] : 'text/plain';
      let [type, params] = MimeParser.parseHeaderField(contentType,
        MimeParser.HEADER_PARAMETER);
      // Use uppercase canonicalization for now
      type = type.toUpperCase();
      let [media, sub] = type.split('/', 2);
      if (media == "MULTIPART") {
        bodystruct += ' "' + sub + '"';
        if (extension) {
          bodystruct += ' ' + paramToString(params);
          // XXX: implement the rest
          bodystruct += ' NIL NIL NIL';
        }
      } else {
        // - body type
        // - body subtype
        // - body parameter parenthesized list = from content-type
        // - body id = from content-id
        // - body description = from content-description (Human readable text
        //    that is almost never present)
        // - body encoding = from content-transfer-encoding
        // - body size = in octets
        // - (if TEXT, size in lines)
        bodystruct += '"' + media + '" "' + sub + '"';
        bodystruct += ' ' + paramToString(params);

        // XXX: Content ID, Content description
        if (headers.has('content-id')) {
          bodystruct += ' "' + headers.get('content-id')[0] + '"';
        }
        else {
          bodystruct += ' NIL';
        }
        bodystruct += ' NIL';


        let cte = headers.has('content-transfer-encoding') ?
          headers.get('content-transfer-encoding')[0].toUpperCase() : '7BIT';
        bodystruct += ' "' + cte + '"';

        bodystruct += ' ' + this.length;
        if (media == "TEXT")
          bodystruct += ' ' + this.numLines;

        // EXTENSION
        // - body MD5
        // - body disposition = content-disposition in paren-list form where the
        //    bare value is then followed by the encoded parameters
        // - body language
        // - body location
        if (extension) {
          bodystruct += ' NIL'; // MD5
          if (headers.has('content-disposition')) {
            let contentDisposition = headers.get('content-disposition')[0];
            let [cdValue, cdParams] = MimeParser.parseHeaderField(
                                        contentDisposition,
                                        MimeParser.HEADER_PARAMETER);
            // XXX paramToString will return NIL if there are no params; that
            // might not be right?  Possibly should just be empty?
            bodystruct += ' ("' + cdValue.toUpperCase() + '" ' +
                            paramToString(cdParams) + ')';
          }
          else {
            bodystruct += ' NIL';
          }
          bodystruct += ' NIL NIL'; // language, location
        }
      }
      bodystruct += ')';
    }
  };
  MimeParser.parseSync(msg, BodyStructureEmitter, {});
  return bodystruct;
}
