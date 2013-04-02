
/**
 * Implements a fake account type for UI testing/playing only.
 **/

define('mailapi/fake/account',
  [
    'mailcomposer',
    'exports'
  ],
  function(
    $mailcomposer,
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Message generation helper code from Thunderbird (written by me for MoMo,
// relicensing is okay) but hackily simplified for this explicit use case.

/**
 * A list of first names for use by MessageGenerator to create deterministic,
 *  reversible names.  To keep things easily reversible, if you add names, make
 *  sure they have no spaces in them!
 */
var FIRST_NAMES = [
  "Andy", "Bob", "Chris", "David", "Emily", "Felix",
  "Gillian", "Helen", "Idina", "Johnny", "Kate", "Lilia",
  "Martin", "Neil", "Olof", "Pete", "Quinn", "Rasmus",
  "Sarah", "Troels", "Ulf", "Vince", "Will", "Xavier",
  "Yoko", "Zig"
  ];

/**
 * A list of last names for use by MessageGenerator to create deterministic,
 *  reversible names.  To keep things easily reversible, if you add names, make
 *  sure they have no spaces in them!
 */
var LAST_NAMES = [
  "Anway", "Bell", "Clarke", "Davol", "Ekberg", "Flowers",
  "Gilbert", "Hook", "Ivarsson", "Jones", "Kurtz", "Lowe",
  "Morris", "Nagel", "Orzabal", "Price", "Quinn", "Rolinski",
  "Stanley", "Tennant", "Ulvaeus", "Vannucci", "Wiggs", "Xavier",
  "Young", "Zig"
  ];

/**
 * A list of adjectives used to construct a deterministic, reversible subject
 *  by MessageGenerator.  To keep things easily reversible, if you add more,
 *  make sure they have no spaces in them!  Also, make sure your additions
 *  don't break the secret Monty Python reference!
 */
var SUBJECT_ADJECTIVES = [
  "Big", "Small", "Huge", "Tiny",
  "Red", "Green", "Blue", "My",
  "Happy", "Sad", "Grumpy", "Angry",
  "Awesome", "Fun", "Lame", "Funky",
  ];

/**
 * A list of nouns used to construct a deterministic, reversible subject
 *  by MessageGenerator.  To keep things easily reversible, if you add more,
 *  make sure they have no spaces in them!  Also, make sure your additions
 *  don't break the secret Monty Python reference!
 */
var SUBJECT_NOUNS = [
  "Meeting", "Party", "Shindig", "Wedding",
  "Document", "Report", "Spreadsheet", "Hovercraft",
  "Aardvark", "Giraffe", "Llama", "Velociraptor",
  "Laser", "Ray-Gun", "Pen", "Sword",
  ];

/**
 * A list of suffixes used to construct a deterministic, reversible subject
 *  by MessageGenerator.  These can (clearly) have spaces in them.  Make sure
 *  your additions don't break the secret Monty Python reference!
 */
var SUBJECT_SUFFIXES = [
  "Today", "Tomorrow", "Yesterday", "In a Fortnight",
  "Needs Attention", "Very Important", "Highest Priority", "Full Of Eels",
  "In The Lobby", "On Your Desk", "In Your Car", "Hiding Behind The Door",
  ];

/**
 * Provides mechanisms for creating vaguely interesting, but at least valid,
 *  SyntheticMessage instances.
 */
function MessageGenerator(startDate, mode) {
  this._clock = startDate || new Date(2012, 5, 14);
  this._nextNameNumber = 0;
  this._nextSubjectNumber = 0;
  this._nextMessageIdNum = 0;

  this._mode = mode || 'info';
}
exports.MessageGenerator = MessageGenerator;
MessageGenerator.prototype = {
  /**
   * The maximum number of unique names makeName can produce.
   */
  MAX_VALID_NAMES: FIRST_NAMES.length * LAST_NAMES.length,
  /**
   * The maximum number of unique e-mail address makeMailAddress can produce.
   */
  MAX_VALID_MAIL_ADDRESSES: FIRST_NAMES.length * LAST_NAMES.length,
  /**
   * The maximum number of unique subjects makeSubject can produce.
   */
  MAX_VALID_SUBJECTS: SUBJECT_ADJECTIVES.length * SUBJECT_NOUNS.length *
                      SUBJECT_SUFFIXES,

  /**
   * Generate a consistently determined (and reversible) name from a unique
   *  value.  Currently up to 26*26 unique names can be generated, which
   *  should be sufficient for testing purposes, but if your code cares, check
   *  against MAX_VALID_NAMES.
   *
   * @param aNameNumber The 'number' of the name you want which must be less
   *     than MAX_VALID_NAMES.
   * @returns The unique name corresponding to the name number.
   */
  makeName: function(aNameNumber) {
    var iFirst = aNameNumber % FIRST_NAMES.length;
    var iLast = (iFirst + Math.floor(aNameNumber / FIRST_NAMES.length)) %
                LAST_NAMES.length;

    return FIRST_NAMES[iFirst] + " " + LAST_NAMES[iLast];
  },

  /**
   * Generate a consistently determined (and reversible) e-mail address from
   *  a unique value; intended to work in parallel with makeName.  Currently
   *  up to 26*26 unique addresses can be generated, but if your code cares,
   *  check against MAX_VALID_MAIL_ADDRESSES.
   *
   * @param aNameNumber The 'number' of the mail address you want which must be
   *     less than MAX_VALID_MAIL_ADDRESSES.
   * @returns The unique name corresponding to the name mail address.
   */
  makeMailAddress: function(aNameNumber) {
    var iFirst = aNameNumber % FIRST_NAMES.length;
    var iLast = (iFirst + Math.floor(aNameNumber / FIRST_NAMES.length)) %
                LAST_NAMES.length;

    return FIRST_NAMES[iFirst].toLowerCase() + "@" +
           LAST_NAMES[iLast].toLowerCase() + ".nul";
  },

  /**
   * Generate a pair of name and e-mail address.
   *
   * @param aNameNumber The optional 'number' of the name and mail address you
   *     want.  If you do not provide a value, we will increment an internal
   *     counter to ensure that a new name is allocated and that will not be
   *     re-used.  If you use our automatic number once, you must use it always,
   *     unless you don't mind or can ensure no collisions occur between our
   *     number allocation and your uses.  If provided, the number must be
   *     less than MAX_VALID_NAMES.
   * @return A list containing two elements.  The first is a name produced by
   *     a call to makeName, and the second an e-mail address produced by a
   *     call to makeMailAddress.  This representation is used by the
   *     SyntheticMessage class when dealing with names and addresses.
   */
  makeNameAndAddress: function(aNameNumber) {
    if (aNameNumber === undefined)
      aNameNumber = this._nextNameNumber++;
    return {
      name: this.makeName(aNameNumber),
      address: this.makeMailAddress(aNameNumber)
    };
  },

  /**
   * Generate and return multiple pairs of names and e-mail addresses.  The
   *  names are allocated using the automatic mechanism as documented on
   *  makeNameAndAddress.  You should accordingly not allocate / hard code name
   *  numbers on your own.
   *
   * @param aCount The number of people you want name and address tuples for.
   * @returns a list of aCount name-and-address tuples.
   */
  makeNamesAndAddresses: function(aCount) {
    var namesAndAddresses = [];
    for (var i=0; i < aCount; i++)
      namesAndAddresses.push(this.makeNameAndAddress());
    return namesAndAddresses;
  },

  /**
   * Generate a consistently determined (and reversible) subject from a unique
   *  value.  Up to MAX_VALID_SUBJECTS can be produced.
   *
   * @param aSubjectNumber The subject number you want generated, must be less
   *     than MAX_VALID_SUBJECTS.
   * @returns The subject corresponding to the given subject number.
   */
  makeSubject: function(aSubjectNumber) {
    if (aSubjectNumber === undefined)
      aSubjectNumber = this._nextSubjectNumber++;
    var iAdjective = aSubjectNumber % SUBJECT_ADJECTIVES.length;
    var iNoun = (iAdjective + Math.floor(aSubjectNumber /
                                         SUBJECT_ADJECTIVES.length)) %
                SUBJECT_NOUNS.length;
    var iSuffix = (iNoun + Math.floor(aSubjectNumber /
                   (SUBJECT_ADJECTIVES.length * SUBJECT_NOUNS.length))) %
                  SUBJECT_SUFFIXES.length;
    return SUBJECT_ADJECTIVES[iAdjective] + " " +
           SUBJECT_NOUNS[iNoun] + " " +
           SUBJECT_SUFFIXES[iSuffix] + " #" + aSubjectNumber;
  },

  /**
   * Fabricate a message-id suitable for the given synthetic message.  Although
   *  we don't use the message yet, in theory it would var us tailor the
   *  message id to the server that theoretically might be sending it.  Or some
   *  such.
   *
   * @param The synthetic message you would like us to make up a message-id for.
   *     We don't set the message-id on the message, that's up to you.
   * @returns a Message-id suitable for the given message.
   */
  makeMessageId: function(aSynthMessage) {
    var msgId = this._nextMessageIdNum + "@made.up";
    this._nextMessageIdNum++;
    return msgId;
  },

  /**
   * Generates a valid date which is after all previously issued dates by this
   *  method, ensuring an apparent ordering of time consistent with the order
   *  in which code is executed / messages are generated.
   * If you need a precise time ordering or precise times, make them up
   *  yourself.
   *
   * @returns A made-up time in JavaScript Date object form.
   */
  makeDate: function() {
    var date = this._clock;
    // advance time by an hour
    this._clock = new Date(date.valueOf() + 60 * 60 * 1000);
    return date;
  },

  /**
   * HACK: copied from our mailbridge implementation.
   *
   * mailcomposer wants from/to/cc/bcc delivered basically like it will show
   * up in the e-mail, except it is fine with unicode.  So we convert our
   * (possibly) structured representation into a flattened representation.
   *
   * (mailcomposer will handle punycode and mime-word encoding as needed.)
   */
  _formatAddresses: function(nameAddrPairs) {
    var addrstrings = [];
    for (var i = 0; i < nameAddrPairs.length; i++) {
      var pair = nameAddrPairs[i];
      // support lazy people providing only an e-mail... or very careful
      // people who are sure they formatted things correctly.
      if (typeof(pair) === 'string') {
        addrstrings.push(pair);
      }
      else {
        addrstrings.push(
          '"' + pair.name.replace(/["']/g, '') + '" <' +
            pair.address + '>');
      }
    }

    return addrstrings.join(', ');
  },


  /**
   * Create a SyntheticMessage.  All arguments are optional, but allow
   *  additional control.  With no arguments specified, a new name/address will
   *  be generated that has not been used before, and sent to a new name/address
   *  that has not been used before.
   *
   * @param aArgs An object with any of the following attributes provided:
   * @param [aArgs.age] A dictionary with potential attributes 'minutes',
   *     'hours', 'days', 'weeks' to specify the message be created that far in
   *     the past.
   * @param [aArgs.attachments] A list of dictionaries suitable for passing to
   *     syntheticPartLeaf, plus a 'body' attribute that has already been
   *     encoded.  Line chopping is on you FOR NOW.
   * @param [aArgs.body] A dictionary suitable for passing to SyntheticPart plus
   *     a 'body' attribute that has already been encoded (if encoding is
   *     required).  Line chopping is on you FOR NOW.  Alternately, use
   *     bodyPart.
   * @param [aArgs.bodyPart] A SyntheticPart to uses as the body.  If you
   *     provide an attachments value, this part will be wrapped in a
   *     multipart/mixed to also hold your attachments.  (You can put
   *     attachments in the bodyPart directly if you want and not use
   *     attachments.)
   * @param [aArgs.callerData] A value to propagate to the callerData attribute
   *     on the resulting message.
   * @param [aArgs.cc] A list of cc recipients (name and address pairs).  If
   *     omitted, no cc is generated.
   * @param [aArgs.from] The name and value pair this message should be from.
   *     Defaults to the first recipient if this is a reply, otherwise a new
   *     person is synthesized via |makeNameAndAddress|.
   * @param [aArgs.inReplyTo] the SyntheticMessage this message should be in
   *     reply-to.  If that message was in reply to another message, we will
   *     appropriately compensate for that.  If a SyntheticMessageSet is
   *     provided we will use the first message in the set.
   * @param [aArgs.replyAll] a boolean indicating whether this should be a
   *     reply-to-all or just to the author of the message.  (er, to-only, not
   *     cc.)
   * @param [aArgs.subject] subject to use; you are responsible for doing any
   *     encoding before passing it in.
   * @param [aArgs.to] The list of recipients for this message, defaults to a
   *     set of toCount newly created persons.
   * @param [aArgs.toCount=1] the number of people who the message should be to.
   * @param [aArgs.clobberHeaders] An object whose contents will overwrite the
   *     contents of the headers object.  This should only be used to construct
   *     illegal header values; general usage should use another explicit
   *     mechanism.
   * @returns a SyntheticMessage fashioned just to your liking.
   */
  makeMessage: function makeMessage(aArgs) {
    aArgs = aArgs || {};

    var headerInfo = {
      id: null,
      suid: null,
      guid: Date.now() + Math.random().toString(16).substr(1) +
              '@mozgaia',
      author: null,
      date: null,
      flags: aArgs.flags || [],
      hasAttachments: false,
      subject: null,
      snippet: null,
    };
    var bodyInfo = {
      to: null,
      cc: null,
      bcc: null,
      replyTo: null,
      attachments: null,
      references: null,
      bodyReps: null,
    };

    if (aArgs.inReplyTo) {
      var srcMsg = aArgs.inReplyTo;

      headerInfo.subject =
        (srcMsg.headerInfo.subject.substring(0, 4) == "Re: ") ?
          srcMsg.headerInfo.subject :
          ("Re: " + srcMsg.headerInfo.subject);
      if (aArgs.replyAll)
        bodyInfo.to = [srcMsg.headerInfo.author].concat(srcMsg.bodyInfo.to.slice(1));
      else
        bodyInfo.to = [srcMsg.headerInfo.author];
      headerInfo.author = srcMsg.bodyInfo.to[0];
    }
    else {
      headerInfo.subject = aArgs.subject || this.makeSubject();
      headerInfo.author = aArgs.from || this.makeNameAndAddress();
      bodyInfo.to = aArgs.to || this.makeNamesAndAddresses(aArgs.toCount || 1);
      if (aArgs.cc)
        bodyInfo.cc = aArgs.cc;
    }

    if (aArgs.age) {
      var age = aArgs.age;
      // start from 'now'
      var ts = this._clock.valueOf() || Date.now();
      if (age.seconds)
        ts -= age.seconds * 1000;
      if (age.minutes)
        ts -= age.minutes * 60 * 1000;
      if (age.hours)
        ts -= age.hours * 60 * 60 * 1000;
      if (age.days)
        ts -= age.days * 24 * 60 * 60 * 1000;
      if (age.weeks)
        ts -= age.weeks * 7 * 24 * 60 * 60 * 1000;
      headerInfo.date = ts;
    }
    else {
      headerInfo.date = this.makeDate().valueOf();
    }

    // use two subjects for the snippet to get it good and long.
    headerInfo.snippet = this.makeSubject() + ' ' + this.makeSubject();

    var rawBody = aArgs.rawBody || null, bodyText,
        replaceHeaders = aArgs.replaceHeaders || null;

    // If a raw body was provided, try and take mailcomposer's logic out of
    // the picture by providing a stub body that we can replace after the
    // MIME structure has been built.  (Alternately, we could fall back to
    // Thunderbird's synthetic mime header stuff, but that is much more
    // limited...)
    if (rawBody) {
      bodyText = '::BODYTEXT::';
    }
    else {
      bodyText = headerInfo.snippet + '\n' +
        'This message is automatically created for you by robots.\n' +
        '\nThe robots may or may not be friendly.\n' +
        'They definitely do not know latin, which is why no lorax gypsum.\n' +
        '\nI am endeavouring to write more words now because scrolling turns' +
        ' out to be something important to test.  I know, I know.  You also' +
        ' are surprised that scrolling is important?  Who would have thunk?\n' +
        '\nI actually have some synthetic markov chain stuff lying around, do' +
        ' you think that would go better?  Perhaps?  Possibly?  Potentially?' +
        ' Pertinent?\n' +
        '\nTo-do:\n' +
        '1: Write more made-up text.\n' +
        '2: Cheat and just add more lines...\n' +
        '\n\n\n\n' +
        '3: ...\n' +
        '\nIt is a tiny screen we target, thank goodness!';
    }
    bodyInfo.bodyReps = [
      { type: 'plain', content: [0x1, bodyText] }
    ];

    if (this._mode === 'info') {
      return {
        headerInfo: headerInfo,
        bodyInfo: bodyInfo,
      };
    }
    else { // 'rfc822'
      var composer = new $mailcomposer.MailComposer();
      var messageOpts = {
        from: this._formatAddresses([headerInfo.author]),
        subject: headerInfo.subject,
        body: bodyText,
        to: this._formatAddresses(bodyInfo.to),
      };
      if (bodyInfo.cc)
        messageOpts.cc = this._formatAddresses(bodyInfo.cc);

      composer.setMessageOption(messageOpts);
      composer.addHeader('Date', new Date(headerInfo.date));
      composer.addHeader('Message-Id', '<' + headerInfo.guid + '>');

      // have it internally accumulate the data rather than using the stream
      // mechanism.
      composer._cacheOutput = true;
      var data = null;
      process.immediate = true;
      composer._processBufferedOutput = function() {
        data = composer._outputBuffer;
      };
      composer._composeMessage();
      process.immediate = false;

      if (rawBody)
        data = data.replace('::BODYTEXT::', rawBody);
      if (replaceHeaders) {
        for (var headerName in replaceHeaders) {
          var headerValue = replaceHeaders[headerName],
              headerRE = new RegExp('^' + headerName + ': [^\r]+\r\n', 'm');
          data = data.replace(headerRE, headerName + ': ' + headerValue +
                              '\r\n');
        }
      }

      return {
        date: new Date(headerInfo.date),
        headerInfo: headerInfo,
        bodyInfo: bodyInfo,
        // XXX mailcomposer is tacking newlines onto the end of the message that
        // we don't want.  Ideally we want to fix mailcomposer...
        messageText: data.trimRight(),
        flags: headerInfo.flags
      };
    }
  },

  MAKE_MESSAGES_DEFAULTS: {
    count: 10,
  },
  MAKE_MESSAGES_PROPAGATE: ['attachments', 'body',
                            'cc', 'flags', 'from', 'to', 'inReplyTo',
                            'subject', 'clobberHeaders'],
  /**
   * Given a set definition, produce a list of synthetic messages.
   *
   * The set definition supports the following attributes:
   *  count: The number of messages to create.
   *  age: As used by makeMessage.
   *  age_incr: Similar to age, but used to increment the values in the age
   *      dictionary (assuming a value of zero if omitted).
   *  age_incr_every: How often to apply age_incr.  If omitted, treated like 1
   *      is specified.  Use this to cluster messages during the middle of the
   *      day so you aren't betrayed by timezone issues.
   *  @param [aSetDef.msgsPerThread=1] The number of messages per thread.  If
   *      you want to create direct-reply threads, you can pass a value for this
   *      and have it not be one.  If you need fancier reply situations,
   *      directly use a scenario or hook us up to support that.
   *
   * Also supported are the following attributes as defined by makeMessage:
   *  attachments, body, from, inReplyTo, subject, to, clobberHeaders, junk
   *
   * If omitted, the following defaults are used, but don't depend on this as we
   *  can change these at any time:
   * - count: 10
   */
  makeMessages: function MessageGenerator_makeMessages(aSetDef) {
    var messages = [];

    var args = {
      age_incr_every: 1,
    }, unit, delta;
    // zero out all the age_incr fields in age (if present)
    if (aSetDef.age_incr) {
      args.age = { seconds: 0 };
      for (unit in aSetDef.age_incr) {
        args.age[unit] = 0;
      }
    }
    // copy over the initial values from age (if present)
    if (aSetDef.age) {
      args.age = args.age || {};
      for (unit in aSetDef.age) {
        var value = aSetDef.age[unit];
        args.age[unit] = value;
      }
    }
    // just copy over any attributes found from MAKE_MESSAGES_PROPAGATE
    for (var iPropName = 0;
         iPropName < this.MAKE_MESSAGES_PROPAGATE.length;
         iPropName++) {
      var propAttrName = this.MAKE_MESSAGES_PROPAGATE[iPropName];
      if (aSetDef[propAttrName])
        args[propAttrName] = aSetDef[propAttrName];
    }

    var count = aSetDef.hasOwnProperty('count') ? aSetDef.count :
                this.MAKE_MESSAGES_DEFAULTS.count;
    var messagesPerThread = aSetDef.msgsPerThread || 1;
    var rawBodies = aSetDef.hasOwnProperty('rawBodies') ? aSetDef.rawBodies
                                                        : null,
        replaceHeaders = aSetDef.hasOwnProperty('replaceHeaders') ?
                           aSetDef.replaceHeaders : null;

    var lastMessage = null;
    for (var iMsg = 0; iMsg < count; iMsg++) {
      // primitive threading support...
      if (lastMessage && (iMsg % messagesPerThread != 0))
        args.inReplyTo = lastMessage;
      else if (!("inReplyTo" in aSetDef))
        args.inReplyTo = null;

      if (rawBodies)
        args.rawBody = rawBodies[iMsg];
      if (replaceHeaders)
        args.replaceHeaders = replaceHeaders[iMsg];

      lastMessage = this.makeMessage(args);
      if (this._mode === 'info') {
        lastMessage.headerInfo.id = '' + iMsg;
        lastMessage.headerInfo.suid = aSetDef.folderId + '/' + iMsg;
      }
      messages.push(lastMessage);

      if (aSetDef.age_incr) {
        if (!aSetDef.age_incr_every ||
            (messages.length % aSetDef.age_incr_every === 0)) {
          args.age.seconds = 0;
          for (unit in aSetDef.age_incr) {
            delta = aSetDef.age_incr[unit];
            args.age[unit] += delta;
          }
        }
        else {
          args.age.seconds++;
        }
      }
    }
    return messages;
  },
};





////////////////////////////////////////////////////////////////////////////////


/**
 * Fake accounts always regenerate from scratch when instantiated; there is
 * no disk persistence.
 *
 * This might be better off being rejiggered to leverage the IMAP account
 * implementation and use some combination of making it think it is
 * permanently offline, manually cramming messages in, and pretending that
 * jobs actually ran on the server.  A mock/fakish IMAP protocol or real
 * protocol talking to a fake socket would likely be too much effort for
 * something likely to be brittle.
 */
function FakeAccount(universe, accountDef, folderInfo, receiveProtoConn, _LOG) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  this.enabled = true;
  this.problems = [];

  var generator = new MessageGenerator();

  this.identities = accountDef.identities;

  var ourIdentity = accountDef.identities[0];
  var ourNameAndAddress = {
    name: ourIdentity.name,
    address: ourIdentity.address,
  };

  var HOURS_MS = 60 * 60 * 1000;
  var inboxFolder = {
    id: this.id + '/0',
    name: 'Inbox',
    path: 'Inbox',
    type: 'inbox',
    delim: '/',
    depth: 0,
    lastSyncedAt: Date.now() - 1 * HOURS_MS,
  };
  var todoFolder = {
    id: this.id + '/1',
    name: 'ToDo',
    path: 'Inbox/ToDo',
    type: 'normal',
    delim: '/',
    depth: 1,
    lastSyncedAt: Date.now() - 3 * HOURS_MS,
  };
  var draftsFolder = {
    id: this.id + '/2',
    name: 'Drafts',
    path: 'Drafts',
    type: 'drafts',
    delim: '/',
    depth: 0,
    lastSyncedAt: Date.now() - 75 * HOURS_MS,
  };
  var sentFolder = {
    id: this.id + '/3',
    name: 'Sent',
    path: 'Sent',
    type: 'sent',
    delim: '/',
    depth: 0,
    lastSyncedAt: Date.now() - 29 * HOURS_MS,
  };

  this.folders = [inboxFolder, todoFolder, draftsFolder, sentFolder];
  this._folderStorages = {};
  this._folderStorages[inboxFolder.id] =
    new FakeFolderStorage(
      inboxFolder,
      generator.makeMessages(
        { folderId: inboxFolder.id, count: 16, to: [ourNameAndAddress] }));
  this._folderStorages[todoFolder.id] =
    new FakeFolderStorage(
      todoFolder,
      generator.makeMessages(
        { folderId: todoFolder.id, count: 2, to: [ourNameAndAddress] }));
  this._folderStorages[draftsFolder.id] =
    new FakeFolderStorage(draftsFolder, []);
  this._folderStorages[sentFolder.id] =
    new FakeFolderStorage(
      sentFolder,
      generator.makeMessages(
        { folderId: sentFolder.id, count: 4, from: ourNameAndAddress }));

  this.meta = folderInfo.$meta;
  this.mutations = folderInfo.$mutations;
}
exports.Account = exports.FakeAccount = FakeAccount;
FakeAccount.prototype = {
  toString: function fa_toString() {
    return '[FakeAccount: ' + this.id + ']';
  },
  toBridgeWire: function fa_toBridgeWire() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: this.accountDef.type,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
      },

      servers: [
        {
          type: this.accountDef.type,
          connInfo: this.accountDef.connInfo
        },
      ]
    };
  },
  toBridgeFolder: function() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: 'account',
    };
  },

  get numActiveConns() {
    return 0;
  },

  saveAccountState: function(reuseTrans) {
    return reuseTrans;
  },

  shutdown: function() {
  },

  createFolder: function() {
    throw new Error('XXX not implemented');
  },

  deleteFolder: function() {
    throw new Error('XXX not implemented');
  },

  getFolderMetaForFolderId: function(folderId) {
    // Just always return null
    return null;
  },

  sliceFolderMessages: function fa_sliceFolderMessages(folderId, bridgeHandle) {
    return this._folderStorages[folderId]._sliceFolderMessages(bridgeHandle);
  },
  syncFolderList: function fa_syncFolderList(callback) {
    // NOP; our list of folders is eternal (for now)
    callback();
  },
  sendMessage: function fa_sendMessage(composedMessage, callback) {
    // XXX put a copy of the message in the sent folder
    callback(null);
  },

  getFolderStorageForFolderId: function fa_getFolderStorageForFolderId(folderId){
    return this._folderStorages[folderId];
  },

  runOp: function(op, mode, callback) {
    // Just pretend we performed the op so no errors trigger.
    if (callback)
      setZeroTimeout(callback);
  },
};

function FakeFolderStorage(folderMeta, headersAndBodies) {
  this._headers = [];
  this._bodiesBySuid = {};
  for (var i = 0; i < headersAndBodies.length; i++) {
    var headerAndBody = headersAndBodies[i];
    this._headers.push(headerAndBody.headerInfo);
    this._bodiesBySuid[headerAndBody.headerInfo.suid] =
      headerAndBody.bodyInfo;
  }
}
FakeFolderStorage.prototype = {
  _sliceFolderMessages: function ffs__sliceFolderMessages(bridgeHandle) {
    bridgeHandle.sendSplice(0, 0, this._headers, true, false);
  },

  getMessageBody: function ffs_getMessageBody(suid, date, callback) {
    callback(this._bodiesBySuid[suid]);
  },
};

}); // end define
;
/**
 * Configurator for fake
 **/

define('mailapi/fake/configurator',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    './account',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $fakeacct,
    exports
  ) {

exports.account = $fakeacct;
exports.configurator = {
  tryToCreateAccount: function cfg_fake_ttca(universe, userDetails, domainInfo,
                                             callback, _LOG) {
    var credentials = {
      username: userDetails.emailAddress,
      password: userDetails.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: userDetails.accountName || userDetails.emailAddress,

      type: 'fake',
      syncRange: 'auto',

      credentials: credentials,
      connInfo: {
        hostname: 'magic.example.com',
        port: 1337,
        crypto: true,
      },

      identities: [
        {
          id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
          name: userDetails.displayName,
          address: userDetails.emailAddress,
          replyTo: null,
          signature: null
        },
      ]
    };

    this._loadAccount(universe, accountDef, function (account) {
      callback(null, account, null);
    });
  },

  recreateAccount: function cfg_fake_ra(universe, oldVersion, oldAccountInfo,
                                        callback) {
    var oldAccountDef = oldAccountInfo.def;
    var credentials = {
      username: oldAccountDef.credentials.username,
      password: oldAccountDef.credentials.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: oldAccountDef.name,

      type: 'fake',
      syncRange: oldAccountDef.syncRange,

      credentials: credentials,
      connInfo: {
        hostname: 'magic.example.com',
        port: 1337,
        crypto: true,
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities)
    };

    this._loadAccount(universe, accountDef, function (account) {
      callback(null, account, null);
    });
  },

  /**
   * Save the account def and folder info for our new (or recreated) account and
   * then load it.
   */
  _loadAccount: function cfg_fake__loadAccount(universe, accountDef, callback) {
    var folderInfo = {
      $meta: {
        nextMutationNum: 0,
        lastFolderSyncAt: 0,
      },
      $mutations: [],
      $mutationState: {},
    };
    universe.saveAccountDef(accountDef, folderInfo);
    universe._loadAccount(accountDef, folderInfo, null, callback);
  },
};

}); // end define
;