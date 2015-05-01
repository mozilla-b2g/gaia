/**
 *
 **/

define(
  [
    'exports',
    // Use a relative link so that consumers do not need to create
    // special config to use main-frame-setup.
    './ext/addressparser'
  ],
  function(
    exports,
    addressparser
  ) {

function objCopy(obj) {
  var copy = {};
  Object.keys(obj).forEach(function (key) {
    copy[key] = obj[key];
  });
  return copy;
}

/**
 * The number of header wire messages to cache in the recvCache
 */
var HEADER_CACHE_LIMIT = 8;

/**
 *
 */
function MailAccount(api, wireRep, acctsSlice) {
  this._api = api;
  this.id = wireRep.id;

  // Hold on to wireRep for caching
  this._wireRep = wireRep;

  // Hold on to acctsSlice for use in determining default account.
  this.acctsSlice = acctsSlice;

  this.type = wireRep.type;
  this.name = wireRep.name;
  this.syncRange = wireRep.syncRange;
  this.syncInterval = wireRep.syncInterval;
  this.notifyOnNew = wireRep.notifyOnNew;
  this.playSoundOnSend = wireRep.playSoundOnSend;

  /**
   * Is the account currently enabled, as in will we talk to the server?
   * Accounts will be automatically disabled in cases where it would be
   * counter-productive for us to keep trying to access the server.
   *
   * For example: the user's password being (apparently) bad, or gmail getting
   * upset about the amount of data transfer and locking the account out for the
   * rest of the day.
   */
  this.enabled = wireRep.enabled;
  /**
   * @listof[@oneof[
   *   @case['bad-user-or-pass']
   *   @case['bad-address']
   *   @case['needs-oauth-reauth']
   *   @case['imap-disabled']
   *   @case['pop-server-not-great']{
   *     The POP3 server doesn't support IDLE and TOP, so we can't use it.
   *   }
   *   @case['connection']{
   *     Generic connection problem; this problem can quite possibly be present
   *     in conjunction with more specific problems such as a bad username /
   *     password.
   *   }
   * ]]{
   *   A list of known problems with the account which explain why the account
   *   might not be `enabled`.  Once a problem is believed to have been
   *   addressed, `clearProblems` should be called.
   * }
   */
  this.problems = wireRep.problems;

  this.identities = [];
  for (var iIdent = 0; iIdent < wireRep.identities.length; iIdent++) {
    this.identities.push(new MailSenderIdentity(this._api,
                                                wireRep.identities[iIdent]));
  }

  this.username = wireRep.credentials.username;
  this.servers = wireRep.servers;

  this.authMechanism = wireRep.credentials.oauth2 ? 'oauth2' : 'password';

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailAccount.prototype = {
  toString: function() {
    return '[MailAccount: ' + this.type + ' ' + this.id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailAccount',
      accountType: this.type,
      id: this.id,
    };
  },

  __update: function(wireRep) {
    this.enabled = wireRep.enabled;
    this.problems = wireRep.problems;
    this.syncRange = wireRep.syncRange;
    this.syncInterval = wireRep.syncInterval;
    this.notifyOnNew = wireRep.notifyOnNew;
    this.playSoundOnSend = wireRep.playSoundOnSend;
    this._wireRep.defaultPriority = wireRep.defaultPriority;

    for (var i = 0; i < wireRep.identities.length; i++) {
      if (this.identities[i]) {
        this.identities[i].__update(wireRep.identities[i]);
      } else {
        this.identities.push(new MailSenderIdentity(this._api,
                                        wireRep.identities[i]));
      }
    }
  },

  __die: function() {
    // currently, nothing to clean up
  },

  /**
   * Tell the back-end to clear the list of problems with the account, re-enable
   * it, and try and connect.
   */
  clearProblems: function(callback) {
    this._api._clearAccountProblems(this, callback);
  },

  /**
   * @args[
   *   @param[mods @dict[
   *     @key[password String]
   *     @key[incomingPassword String]
   *     @key[outgoingPassword String]
   *     @key[username String]
   *     @key[incomingUsername String]
   *     @key[outgoingUsername String]
   *   ]]
   *   @param[callback function]
   * ]{
   *   Modify properties on the account.
   *
   *   In addition to regular account property settings,
   *   "setAsDefault": true can be passed to set this account as the
   *   default acccount.
   *
   *   # Username and Password Setting
   *
   *   If you want to modify the username or password of an account,
   *   keep in mind that IMAP/POP3 accounts might have two separate
   *   passwords, one for incoming mail and one for SMTP. You have a
   *   couple options:
   *
   *   - If you specify "username" and/or "password", we'll change the
   *     incoming side, and if the SMTP side had the same
   *     username/password, we'll change that too.
   *
   *   - If you specify incomingUsername, incomingPassword, etc., we
   *     will NOT do that magic inferring; we'll just change the side
   *     you specify.
   *
   *   Practically speaking, most accounts will likely share the same
   *   username and password. Additionally, if we guess that the
   *   passwords/usernames should match when they actually should
   *   differ, we'll safely recover becuase we'll then ask for a
   *   corrected SMTP password.
   * }
   */
  modifyAccount: function(mods, callback) {
    this._api._modifyAccount(this, mods, callback);
  },

  /**
   * Delete the account and all its associated data.  No privacy guarantees are
   * provided; we just delete the data from the database, so it's up to the
   * (IndexedDB) database's guarantees on that.
   */
  deleteAccount: function() {
    this._api._deleteAccount(this);
  },

  /**
   * Returns true if this account is the default account, by looking at
   * all accounts in the acctsSlice.
   */
  get isDefault() {
    if (!this.acctsSlice)
      throw new Error('No account slice available');

    return this.acctsSlice.defaultAccount === this;
  },
};

/**
 * Sender identities define one of many possible sets of sender info and are
 * associated with a single `MailAccount`.
 *
 * Things that can vary:
 * - user's display name
 * - e-mail address,
 * - reply-to address
 * - signature
 */
function MailSenderIdentity(api, wireRep) {
  // We store the API so that we can create identities for the composer without
  // needing to create an account too.
  this._api = api;
  this.id = wireRep.id;

  this.name = wireRep.name;
  this.address = wireRep.address;
  this.replyTo = wireRep.replyTo;
  this.signature = wireRep.signature;
  this.signatureEnabled = wireRep.signatureEnabled;

}
MailSenderIdentity.prototype = {
  toString: function() {
    return '[MailSenderIdentity: ' + this.type + ' ' + this.id + ']';
  },
  toJSON: function() {
    return { type: 'MailSenderIdentity' };
  },

  __update: function(wireRep) {
    this.id = wireRep.id;
    this.name = wireRep.name;
    this.address = wireRep.address;
    this.replyTo = wireRep.replyTo;
    this.signature = wireRep.signature;
    this.signatureEnabled = wireRep.signatureEnabled;
  },
  /**
   * Modifies the identity. Applies all of the changes in mods
   * and leaves all other values the same.
   *
   * @param  {Object}   mods     The changes to be applied
   * @param  {Function} callback
   */
  modifyIdentity: function(mods, callback) {
    // These update signature data immediately, so that the UI
    // reflects the changes properly before the backend properly
    // updates the data
    if (typeof mods.signature !== 'undefined') {
      this.signature = mods.signature;
    }
    if (typeof mods.signatureEnabled !== 'undefined') {
      this.signatureEnabled = mods.signatureEnabled;
    }
    this._api._modifyIdentity(this, mods, callback);
  },

  __die: function() {
    // nothing to clean up currently
  },
};
// For testing
exports._MailFolder = MailFolder;

function MailFolder(api, wireRep) {
  this._api = api;

  this.__update(wireRep);

  this.onchange = null;
  this.onremove = null;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailFolder.prototype = {
  toString: function() {
    return '[MailFolder: ' + this.path + ']';
  },
  toJSON: function() {
    return {
      type: this.type,
      path: this.path
    };
  },
  /**
   * Loads the current unread message count as reported by the FolderStorage backend.
   * this.unread is the current number of unread messages that are stored within the
   * FolderStorage object for this folder. Thus, it only accounts for messages
   * which the user has loaded from the server.
  */
  __update: function(wireRep) {
    // Hold on to wireRep for caching
    this._wireRep = wireRep;

    this.unread = wireRep.unreadCount;

    this.lastSyncedAt = wireRep.lastSyncedAt ? new Date(wireRep.lastSyncedAt)
                                             : null;
    this.path = wireRep.path;
    this.id = wireRep.id;

    /**
     * The human-readable name of the folder.  (As opposed to its path or the
     * modified utf-7 encoded folder names.)
     */
    this.name = wireRep.name;
    /**
     * The full string of the path.
     */
    this.path = wireRep.path;
    /**
     * The hierarchical depth of this folder.
     */
    this.depth = wireRep.depth;
    /**
     * @oneof[
     *   @case['account']{
     *     It's not really a folder at all, just an account serving as hierarchy
     *   }
     *   @case['nomail']{
     *     A folder that exists only to provide hierarchy but which can't
     *     contain messages.  An artifact of various mail backends that are
     *     reflected in IMAP as NOSELECT.
     *   }
     *   @case['inbox']
     *   @case['drafts']
     *   @case['localdrafts']{
     *     Local-only folder that stores drafts composed on this device.
     *   }
     *   @case['sent']
     *   @case['trash']
     *   @case['archive']
     *   @case['junk']
     *   @case['starred']
     *   @case['important']
     *   @case['normal']{
     *     A traditional mail folder with nothing special about it.
     *   }
     * ]{
     *   Non-localized string indicating the type of folder this is, primarily
     *   for styling purposes.
     * }
     */
    this.type = wireRep.type;

    // Exchange folder name with the localized version if available
    this.name = this._api.l10n_folder_name(this.name, this.type);

    this.selectable = ((wireRep.type !== 'account') &&
                       (wireRep.type !== 'nomail'));

    this.neededForHierarchy = !this.selectable;

    /**
     *  isValidMoveTarget denotes whether this folder is a valid
     *  place for messages to be moved into.
     */
    switch (this.type) {
      case 'localdrafts':
      case 'outbox':
      case 'account':
      case 'nomail':
        this.isValidMoveTarget = false;
        break;
      default:
        this.isValidMoveTarget = true;
    }
  },

  __die: function() {
    // currently nothing to clean up
  }
};

function filterOutBuiltinFlags(flags) {
  // so, we could mutate in-place if we were sure the wire rep actually came
  // over the wire.  Right now there is de facto rep sharing, so let's not
  // mutate and screw ourselves over.
  var outFlags = [];
  for (var i = flags.length - 1; i >= 0; i--) {
    if (flags[i][0] !== '\\')
      outFlags.push(flags[i]);
  }
  return outFlags;
}

/**
 * Extract the canonical naming attributes out of the MailHeader instance.
 */
function serializeMessageName(x) {
  return {
    date: x.date.valueOf(),
    suid: x.id,
    // NB: strictly speaking, this is redundant information.  However, it is
    // also fairly handy to pass around for IMAP since otherwise we might need
    // to perform header lookups later on.  It will likely also be useful for
    // debugging.  But ideally we would not include this.
    guid: x.guid
  };
}

/**
 * Caches contact lookups, both hits and misses, as well as updating the
 * MailPeep instances returned by resolve calls.
 *
 * We maintain strong maps from both contact id and e-mail address to MailPeep
 * instances.  We hold a strong reference because BridgedViewSlices already
 * require explicit lifecycle maintenance (aka call die() when done with them).
 * We need the contact id and e-mail address because when a contact is changed,
 * an e-mail address may be changed, and we don't get to see the old
 * representation.  So if the e-mail address was deleted, we need the contact id
 * mapping.  And if the e-mail address was added, we need the e-mail address
 * mapping.
 *
 * If the mozContacts API is not available, we just create inert MailPeep
 * instances that do not get tracked or updated.
 *
 * Domain notes:
 *
 * The contacts API does not enforce any constraints on the number of contacts
 * who can use an e-mail address, but the e-mail app only allows one contact
 * to correspond to an e-mail address at a time.
 */
var ContactCache = exports.ContactCache = {
  /**
   * Maps e-mail addresses to the mozContact rep for the object, or null if
   * there was a miss.
   *
   * We explicitly do not want to choose an arbitrary MailPeep instance to
   * (re)use because it could lead to GC memory leaks if data/element/an expando
   * were set on the MailPeep and we did not zero it out when the owning slice
   * was destroyed.  We could, however, use the live set of peeps as a fallback
   * if we don't have a contact cached.
   */
  _contactCache: Object.create(null),
  /** The number of entries in the cache. */
  _cacheHitEntries: 0,
  /** The number of stored misses in the cache. */
  _cacheEmptyEntries: 0,

  /**
   * Maximum number of hit entries in the cache before we should clear the
   * cache.
   */
  MAX_CACHE_HITS: 256,
  /** Maximum number of empty entries to store in the cache before clearing. */
  MAX_CACHE_EMPTY: 1024,

  /** Maps contact id to lists of MailPeep instances. */
  _livePeepsById: Object.create(null),
  /** Maps e-mail addresses to lists of MailPeep instances */
  _livePeepsByEmail: Object.create(null),

  pendingLookupCount: 0,

  callbacks: [],

  init: function() {
    var contactsAPI = navigator.mozContacts;
    if (!contactsAPI)
      return;

    contactsAPI.oncontactchange = this._onContactChange.bind(this);
  },

  _resetCache: function() {
    this._contactCache = Object.create(null);
    this._cacheHitEntries = 0;
    this._cacheEmptyEntries = 0;
  },

  shutdown: function() {
    var contactsAPI = navigator.mozContacts;
    if (!contactsAPI)
      return;
    contactsAPI.oncontactchange = null;
  },

  /**
   * Currently we process the updates in real-time as we get them.  There's an
   * inherent trade-off between chewing CPU when we're in the background and
   * minimizing latency when we are displayed.  We're biased towards minimizing
   * latency right now.
   *
   * All contact changes flush our contact cache rather than try and be fancy.
   * We are already fancy with the set of live peeps and our lookups could just
   * leverage that.  (The contact cache is just intended as a steady-state
   * high-throughput thing like when displaying messages in the UI.  We don't
   * expect a lot of contact changes to happen during that time.)
   *
   * For info on the events/triggers, see:
   * https://developer.mozilla.org/en-US/docs/DOM/ContactManager.oncontactchange
   */
  _onContactChange: function(event) {
    var contactsAPI = navigator.mozContacts;
    var livePeepsById = this._livePeepsById,
        livePeepsByEmail = this._livePeepsByEmail;

    // clear the cache if it has anything in it (per the above doc block)
    if (this._cacheHitEntries || this._cacheEmptyEntries)
      this._resetCache();

    // -- Contact removed OR all contacts removed!
    if (event.reason === 'remove') {
      function cleanOutPeeps(livePeeps) {
        for (var iPeep = 0; iPeep < livePeeps.length; iPeep++) {
          var peep = livePeeps[iPeep];
          peep.contactId = null;
          if (peep.onchange) {
            try {
              peep.onchange(peep);
            }
            catch (ex) {
              reportClientCodeError('peep.onchange error', ex, '\n',
                                    ex.stack);
            }
          }
        }
      }

      // - all contacts removed! (clear() called)
      var livePeeps;
      if (!event.contactID) {
        for (var contactId in livePeepsById) {
          livePeeps = livePeepsById[contactId];
          cleanOutPeeps(livePeeps);
          this._livePeepsById = Object.create(null);
        }
      }
      // - just one contact removed
      else {
        livePeeps = livePeepsById[event.contactID];
        if (livePeeps) {
          cleanOutPeeps(livePeeps);
          delete livePeepsById[event.contactID];
        }
      }
    }
    // -- Created or updated; we need to fetch the contact to investigate
    else {
      var req = contactsAPI.find({
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: event.contactID
      });
      req.onsuccess = function() {
        // If the contact disappeared we will hear a 'remove' event and so don't
        // need to process this.
        if (!req.result.length)
          return;
        var contact = req.result[0], livePeeps, iPeep, peep;

        // - process update with apparent e-mail address removal
        if (event.reason === 'update') {
          livePeeps = livePeepsById[contact.id];
          if (livePeeps) {
            var contactEmails = contact.email ?
                  contact.email.map(function(e) { return e.value; }) :
                [];
            for (iPeep = 0; iPeep < livePeeps.length; iPeep++) {
              peep = livePeeps[iPeep];
              if (contactEmails.indexOf(peep.address) === -1) {
                // Need to fix-up iPeep because of the splice; reverse iteration
                // reorders our notifications and we don't want that, hence
                // this.
                livePeeps.splice(iPeep--, 1);
                peep.contactId = null;
                if (peep.onchange) {
                  try {
                    peep.onchange(peep);
                  }
                  catch (ex) {
                    reportClientCodeError('peep.onchange error', ex, '\n',
                                          ex.stack);
                  }
                }
              }
            }
            if (livePeeps.length === 0)
              delete livePeepsById[contact.id];
          }
        }
        // - process create/update causing new coverage
        if (!contact.email)
          return;
        for (var iEmail = 0; iEmail < contact.email.length; iEmail++) {
          var email = contact.email[iEmail].value;
          livePeeps = livePeepsByEmail[email];
          // nothing to do if there are no peeps that use that email address
          if (!livePeeps)
            continue;

          for (iPeep = 0; iPeep < livePeeps.length; iPeep++) {
            peep = livePeeps[iPeep];
            // If the peep is not yet associated with this contact or any other
            // contact, then associate it.
            if (!peep.contactId) {
              peep.contactId = contact.id;
              var idLivePeeps = livePeepsById[peep.contactId];
              if (idLivePeeps === undefined)
                idLivePeeps = livePeepsById[peep.contactId] = [];
              idLivePeeps.push(peep);
            }
            // However, if it's associated with a different contact, then just
            // skip the peep.
            else if (peep.contactId !== contact.id) {
              continue;
            }
            // (The peep must be associated with this contact, so update and
            // fire)

            if (contact.name && contact.name.length)
              peep.name = contact.name[0];
            if (peep.onchange) {
              try {
                peep.onchange(peep);
              }
              catch (ex) {
                reportClientCodeError('peep.onchange error', ex, '\n',
                                      ex.stack);
              }
            }
          }
        }
      };
      // We don't need to do anything about onerror; the 'remove' event will
      // probably have fired in this case, making us correct.
    }
  },

  resolvePeeps: function(addressPairs) {
    if (addressPairs == null)
      return null;
    var resolved = [];
    for (var i = 0; i < addressPairs.length; i++) {
      resolved.push(this.resolvePeep(addressPairs[i]));
    }
    return resolved;
  },
  /**
   * Create a MailPeep instance with the best information available and return
   * it.  Information from the (moz)Contacts API always trumps the passed-in
   * information.  If we have a cache hit (which covers both positive and
   * negative evidence), we are done/all resolved immediately.  Otherwise, we
   * need to issue an async request.  In that case, you want to check
   * ContactCache.pendingLookupCount and push yourself onto
   * ContactCache.callbacks if you want to be notified when the current set of
   * lookups gets resolved.
   *
   * This is a slightly odd API, but it's based on the knowledge that for a
   * single e-mail we will potentially need to perform multiple lookups and that
   * e-mail addresses are also likely to come in batches so there's no need to
   * generate N callbacks when 1 will do.
   */
  resolvePeep: function(addressPair) {
    var emailAddress = addressPair.address;
    var entry = this._contactCache[emailAddress], contact, peep;
    var contactsAPI = navigator.mozContacts;
    // known miss; create miss peep
    // no contacts API, always a miss, skip out before extra logic happens
    if (entry === null || !contactsAPI) {
      peep = new MailPeep(addressPair.name || '', emailAddress, null, null);
      if (!contactsAPI)
        return peep;
    }
    // known contact; unpack contact info
    else if (entry !== undefined) {
      var name = addressPair.name || '';
      if (entry.name && entry.name.length)
        name = entry.name[0];
      peep = new MailPeep(
        name,
        emailAddress,
        entry.id,
        (entry.photo && entry.photo.length) ? entry.photo[0] : null);
    }
    // not yet looked-up; assume it's a miss and we'll fix-up if it's a hit
    else {
      peep = new MailPeep(addressPair.name || '',
                          emailAddress, null, null);

      // Place a speculative miss in the contact cache so that additional
      // requests take that path.  They will get fixed up when our lookup
      // returns (or if a change event happens to come in before our lookup
      // returns.)  Note that we do not do any hit/miss counting right now; we
      // wait for the result to come back.
      this._contactCache[emailAddress] = null;

      this.pendingLookupCount++;

      // Search contacts, but use an all lower-case name, since the contacts
      // API's search plumbing uses a lowercase version of the email address
      // for these search comparisons. However, the actual display of the
      // contact in the contact app has casing preserved. emailAddress could
      // be undefined though if a group/undisclosed-recipients case, so guard
      // against that (deeper normalization fix tracked in bug 1097820). Using
      // empty string in the undefined emailAddress case because passing the
      // value of undefined directly in the filterValue results in some contacts
      // being returned. Potentially all contacts. However passing empty string
      // gives back no results, even if there is a contact with no email address
      // assigned to it.
      var filterValue = emailAddress ? emailAddress.toLowerCase() : '';
      var req = contactsAPI.find({
                  filterBy: ['email'],
                  filterOp: 'equals',
                  filterValue: filterValue
                });
      var self = this, handleResult = function() {
        if (req.result && req.result.length) {
          // CONSIDER TODO SOMEDAY: since the search is done witha a
          // toLowerCase() call, it is conceivable that we could get multiple
          // results with slightly different casing. It might be nice to try
          // to find the best casing match, but the payoff for that is likely
          // small, and the common case will be that the first one is good to
          // use.
          var contact = req.result[0];

          ContactCache._contactCache[emailAddress] = contact;
          if (++ContactCache._cacheHitEntries > ContactCache.MAX_CACHE_HITS)
            self._resetCache();

          var peepsToFixup = self._livePeepsByEmail[emailAddress];
          // there might no longer be any MailPeeps alive to care; leave
          if (!peepsToFixup)
            return;
          for (var i = 0; i < peepsToFixup.length; i++) {
            var peep = peepsToFixup[i];
            if (!peep.contactId) {
              peep.contactId = contact.id;
              var livePeeps = self._livePeepsById[peep.contactId];
              if (livePeeps === undefined)
                livePeeps = self._livePeepsById[peep.contactId] = [];
              livePeeps.push(peep);
            }

            if (contact.name && contact.name.length)
              peep.name = contact.name[0];
            if (contact.photo && contact.photo.length)
              peep._thumbnailBlob = contact.photo[0];

            // If no one is waiting for our/any request to complete, generate an
            // onchange notification.
            if (!self.callbacks.length) {
              if (peep.onchange) {
                try {
                  peep.onchange(peep);
                }
                catch (ex) {
                  reportClientCodeError('peep.onchange error', ex, '\n',
                                        ex.stack);
                }
              }
            }
          }
        }
        else {
          ContactCache._contactCache[emailAddress] = null;
          if (++ContactCache._cacheEmptyEntries > ContactCache.MAX_CACHE_EMPTY)
            self._resetCache();
        }
        // Only notify callbacks if all outstanding lookups have completed
        if (--self.pendingLookupCount === 0) {
          for (i = 0; i < ContactCache.callbacks.length; i++) {
            ContactCache.callbacks[i]();
          }
          ContactCache.callbacks.splice(0, ContactCache.callbacks.length);
        }
      };
      req.onsuccess = handleResult;
      req.onerror = handleResult;
    }

    // - track the peep in our lists of live peeps
    var livePeeps;
    livePeeps = this._livePeepsByEmail[emailAddress];
    if (livePeeps === undefined)
      livePeeps = this._livePeepsByEmail[emailAddress] = [];
    livePeeps.push(peep);

    if (peep.contactId) {
      livePeeps = this._livePeepsById[peep.contactId];
      if (livePeeps === undefined)
        livePeeps = this._livePeepsById[peep.contactId] = [];
      livePeeps.push(peep);
    }

    return peep;
  },

  forgetPeepInstances: function() {
    var livePeepsById = this._livePeepsById,
        livePeepsByEmail = this._livePeepsByEmail;
    for (var iArg = 0; iArg < arguments.length; iArg++) {
      var peeps = arguments[iArg];
      if (!peeps)
        continue;
      for (var iPeep = 0; iPeep < peeps.length; iPeep++) {
        var peep = peeps[iPeep], livePeeps, idx;
        if (peep.contactId) {
          livePeeps = livePeepsById[peep.contactId];
          if (livePeeps) {
            idx = livePeeps.indexOf(peep);
            if (idx !== -1) {
              livePeeps.splice(idx, 1);
              if (livePeeps.length === 0)
                delete livePeepsById[peep.contactId];
            }
          }
        }
        livePeeps = livePeepsByEmail[peep.address];
        if (livePeeps) {
          idx = livePeeps.indexOf(peep);
          if (idx !== -1) {
            livePeeps.splice(idx, 1);
            if (livePeeps.length === 0)
              delete livePeepsByEmail[peep.address];
          }
        }
      }
    }
  },
};

function revokeImageSrc() {
  // see showBlobInImg below for the rationale for useWin.
  var useWin = this.ownerDocument.defaultView || window;
  useWin.URL.revokeObjectURL(this.src);
}
function showBlobInImg(imgNode, blob) {
  // We need to look at the image node because object URLs are scoped per
  // document, and for HTML e-mails, we use an iframe that lives in a different
  // document than us.
  //
  // the "|| window" is for our shimmed testing environment and should not
  // happen in production.
  var useWin = imgNode.ownerDocument.defaultView || window;
  imgNode.src = useWin.URL.createObjectURL(blob);
  // We can revoke the URL after we are 100% sure the image has resolved the URL
  // to get at the underlying blob.  Once autorevoke URLs are supported, we can
  // stop doing this.
  imgNode.addEventListener('load', revokeImageSrc);
}

function MailPeep(name, address, contactId, thumbnailBlob) {
  this.name = name;
  this.address = address;
  this.contactId = contactId;
  this._thumbnailBlob = thumbnailBlob;

  this.element = null;
  this.data = null;
  // peeps are usually one of: from, to, cc, bcc
  this.type = null;

  this.onchange = null;
}
MailPeep.prototype = {
  get isContact() {
    return this.contactId !== null;
  },

  toString: function() {
    return '[MailPeep: ' + this.address + ']';
  },
  toJSON: function() {
    return {
      name: this.name,
      address: this.address,
      contactId: this.contactId
    };
  },
  toWireRep: function() {
    return {
      name: this.name,
      address: this.address
    };
  },

  get hasPicture() {
    return this._thumbnailBlob !== null;
  },
  /**
   * Display the contact's thumbnail on the given image node, abstracting away
   * the issue of Blob URL life-cycle management.
   */
  displayPictureInImageTag: function(imgNode) {
    if (this._thumbnailBlob)
      showBlobInImg(imgNode, this._thumbnailBlob);
  },
};

/**
 * Email overview information for displaying the message in the list as planned
 * for the current UI.  Things that we don't need (ex: to/cc/bcc) for the list
 * end up on the body, currently.  They will probably migrate to the header in
 * the future.
 *
 * Events are generated if the metadata of the message changes or if the message
 * is removed.  The `BridgedViewSlice` instance is how the system keeps track
 * of what messages are being displayed/still alive to need updates.
 */
function MailHeader(slice, wireRep) {
  this._slice = slice;

  // Store the wireRep so it can be used for caching.
  this._wireRep = wireRep;

  this.id = wireRep.suid;
  this.guid = wireRep.guid;

  this.author = ContactCache.resolvePeep(wireRep.author);
  this.to = ContactCache.resolvePeeps(wireRep.to);
  this.cc = ContactCache.resolvePeeps(wireRep.cc);
  this.bcc = ContactCache.resolvePeeps(wireRep.bcc);
  this.replyTo = wireRep.replyTo;

  this.date = new Date(wireRep.date);

  this.__update(wireRep);
  this.hasAttachments = wireRep.hasAttachments;

  this.subject = wireRep.subject;
  this.snippet = wireRep.snippet;

  this.onchange = null;
  this.onremove = null;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailHeader.prototype = {
  toString: function() {
    return '[MailHeader: ' + this.id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailHeader',
      id: this.id
    };
  },

  /**
   * The use-case is the message list providing the message reader with a
   * header.  The header really wants to get update notifications from the
   * backend and therefore not be inert, but that's a little complicated and out
   * of scope for the current bug.
   *
   * We clone at all because our MailPeep.onchange and MailPeep.element values
   * were getting clobbered.  All the instances are currently intended to map
   * 1:1 to a single UI widget, so cloning seems like the right thing to do.
   *
   * A deeper issue is whether the message reader will want to have its own
   * slice since the reader will soon allow forward/backward navigation.  I
   * assume we'll want the message list to track that movement, which suggests
   * that it really doesn't want to do that.  This suggests we'll either want
   * non-inert clones or to just use a list-of-handlers model with us using
   * closures and being careful about removing event handlers.
   */
  makeCopy: function() {
    return new MailHeader(this._slice, this._wireRep);
  },

  __update: function(wireRep) {
    this._wireRep = wireRep;
    if (wireRep.snippet !== null) {
      this.snippet = wireRep.snippet;
    }

    this.isRead = wireRep.flags.indexOf('\\Seen') !== -1;
    this.isStarred = wireRep.flags.indexOf('\\Flagged') !== -1;
    this.isRepliedTo = wireRep.flags.indexOf('\\Answered') !== -1;
    this.isForwarded = wireRep.flags.indexOf('$Forwarded') !== -1;
    this.isJunk = wireRep.flags.indexOf('$Junk') !== -1;
    this.tags = filterOutBuiltinFlags(wireRep.flags);

    // Messages in the outbox will have `sendStatus` populated like so:
    // {
    //   state: 'pending', 'error', 'success', 'sending', or 'syncDone'
    //   err: null,
    //   badAddresses: null,
    //   sendFailures: 2
    // }
    this.sendStatus = wireRep.sendStatus || {};
  },

  /**
   * Release subscriptions associated with the header; currently this just means
   * tell the ContactCache we no longer care about the `MailPeep` instances.
   */
  __die: function() {
    ContactCache.forgetPeepInstances([this.author], this.to, this.cc, this.bcc);
  },

  /**
   * Delete this message
   */
  deleteMessage: function() {
    return this._slice._api.deleteMessages([this]);
  },

  /*
   * Copy this message to another folder.
   */
  /*
  copyMessage: function(targetFolder) {
    return this._slice._api.copyMessages([this], targetFolder);
  },
  */

  /**
   * Move this message to another folder.
   */
  moveMessage: function(targetFolder) {
    return this._slice._api.moveMessages([this], targetFolder);
  },

  /**
   * Set or clear the read status of this message.
   */
  setRead: function(beRead) {
    return this._slice._api.markMessagesRead([this], beRead);
  },

  /**
   * Set or clear the starred/flagged status of this message.
   */
  setStarred: function(beStarred) {
    return this._slice._api.markMessagesStarred([this], beStarred);
  },

  /**
   * Add and/or remove tags/flags from this messages.
   */
  modifyTags: function(addTags, removeTags) {
    return this._slice._api.modifyMessageTags([this], addTags, removeTags);
  },

  /**
   * Request the `MailBody` instance for this message, passing it to
   * the provided callback function once retrieved. If you request the
   * bodyReps as part of this call, the backend guarantees that it
   * will only call the "onchange" notification when the body has
   * actually changed. In other words, if you end up calling getBody()
   * multiple times for some reason, the backend will be smart about
   * only fetching the bodyReps the first time and generating change
   * notifications as one would expect.
   *
   * @args[
   *   @param[options @dict[
   *     @key[downloadBodyReps #:default false]{
   *       Asynchronously initiate download of the body reps.  The body may
   *       be returned before the body parts are downloaded, but they will
   *       eventually show up.  Use the 'onchange' event to hear as the body
   *       parts get added.
   *     }
   *     @key[withBodyReps #:default false]{
   *       Don't return until the body parts are fully downloaded.
   *     }
   *   ]]
   * ]
   */
  getBody: function(options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = null;
    }
    this._slice._api._getBodyForMessage(this, options, callback);
  },

  /**
   * Returns the number of bytes needed before we can display the full
   * body. If this value is large, we should warn the user that they
   * may be downloading a large amount of data. For IMAP, this value
   * is the amount of data we need to render bodyReps and
   * relatedParts; for POP3, we need the whole message.
   */
  get bytesToDownloadForBodyDisplay() {
    // If this is unset (old message), default to zero so that we just
    // won't show any warnings (rather than prompting incorrectly).
    return this._wireRep.bytesToDownloadForBodyDisplay || 0;
  },

  /**
   * Assume this is a draft message and return a MessageComposition object
   * that will be asynchronously populated.  The provided callback will be
   * notified once all composition state has been loaded.
   *
   * The underlying message will be replaced by other messages as the draft
   * is updated and effectively deleted once the draft is completed.  (A
   * move may be performed instead.)
   */
  editAsDraft: function(callback) {
    var composer = this._slice._api.resumeMessageComposition(this, callback);
    composer.hasDraft = true;
    return composer;
  },

  /**
   * Start composing a reply to this message.
   *
   * @args[
   *   @param[replyMode @oneof[
   *     @default[null]{
   *       To be specified...
   *     }
   *     @case['sender']{
   *       Reply to the author of the message.
   *     }
   *     @case['list']{
   *       Reply to the mailing list the message was received from.  If there
   *       were other mailing lists copied on the message, they will not
   *       be included.
   *     }
   *     @case['all']{
   *       Reply to the sender and all listed recipients of the message.
   *     }
   *   ]]{
   *     The not currently used reply-mode.
   *   }
   * ]
   * @return[MessageComposition]
   */
  replyToMessage: function(replyMode, callback) {
    return this._slice._api.beginMessageComposition(
      this, null, { replyTo: this, replyMode: replyMode }, callback);
  },

  /**
   * Start composing a forward of this message.
   *
   * @args[
   *   @param[forwardMode @oneof[
   *     @case['inline']{
   *       Forward the message inline.
   *     }
   *   ]]
   * ]
   * @return[MessageComposition]
   */
  forwardMessage: function(forwardMode, callback) {
    return this._slice._api.beginMessageComposition(
      this, null, { forwardOf: this, forwardMode: forwardMode }, callback);
  },
};

/**
 * Represents a mail message that matched some search criteria by providing
 * both the header and information about the matches that occurred.
 */
function MailMatchedHeader(slice, wireRep) {
  this.header = new MailHeader(slice, wireRep.header);
  this.matches = wireRep.matches;

  this.element = null;
  this.data = null;
}
MailMatchedHeader.prototype = {
  toString: function() {
    return '[MailMatchedHeader: ' + this.header.id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailMatchedHeader',
      id: this.header.id
    };
  },

  __update: function(wireRep) {
    this.matches = wireRep.matches;
    this.header.__update(wireRep.header);
  },

  __die: function() {
    this.header.__die();
  },
};

/**
 * Lists the attachments in a message as well as providing a way to display the
 * body while (eventually) also accounting for message quoting.
 *
 * Mail bodies are immutable and so there are no events on them or lifetime
 * management to worry about.  However, you should keep the `MailHeader` alive
 * and worry about its lifetime since the message can get deleted, etc.
 */
function MailBody(api, suid, wireRep, handle) {
  this._api = api;
  this.id = suid;
  this._date = wireRep.date;
  this._handle = handle;

  this.attachments = null;
  if (wireRep.attachments) {
    this.attachments = [];
    for (var iAtt = 0; iAtt < wireRep.attachments.length; iAtt++) {
      this.attachments.push(
        new MailAttachment(this, wireRep.attachments[iAtt]));
    }
  }
  this._relatedParts = wireRep.relatedParts;
  this.bodyReps = wireRep.bodyReps;
  // references is included for debug/unit testing purposes, hence is private
  this._references = wireRep.references;

  this.onchange = null;
  this.ondead = null;
}
MailBody.prototype = {
  toString: function() {
    return '[MailBody: ' + this.id + ']';
  },
  toJSON: function() {
    return {
      type: 'MailBody',
      id: this.id
    };
  },

  __update: function(wireRep, detail) {
    // Related parts and bodyReps have no state we need to maintain.  Just
    // replace them with the new copies for simplicity.
    this._relatedParts = wireRep.relatedParts;
    this.bodyReps = wireRep.bodyReps;

    // detaching an attachment is special since we need to splice the attachment
    // out.
    if (detail && detail.changeDetails &&
        detail.changeDetails.detachedAttachments) {
      var indices = detail.changeDetails.detachedAttachments;
      for (var iSplice = 0; iSplice < indices.length; iSplice++) {
        this.attachments.splice(indices[iSplice], 1);
      }
    }

    // Attachment instances need to be updated rather than replaced.
    if (wireRep.attachments) {
      var i, attachment;
      for (i = 0; i < this.attachments.length; i++) {
        attachment = this.attachments[i];
        attachment.__update(wireRep.attachments[i]);
      }
      // If we added new attachments, construct them now.
      for (i = this.attachments.length; i < wireRep.attachments.length; i++) {
        this.attachments.push(
          new MailAttachment(this, wireRep.attachments[i]));
      }
      // We don't handle the fictional case where wireRep.attachments
      // decreases in size, because that doesn't currently happen and
      // probably won't ever, apart from detachedAttachments above
      // which are a different thing.
    }
  },

  /**
   * true if this is an HTML document with inline images sent as part of the
   * messages.
   */
  get embeddedImageCount() {
    if (!this._relatedParts)
      return 0;
    return this._relatedParts.length;
  },

  /**
   * true if all the bodyReps are downloaded.
   */
  get bodyRepsDownloaded() {
    var i = 0;
    var len = this.bodyReps.length;

    for (; i < len; i++) {
      if (!this.bodyReps[i].isDownloaded) {
        return false;
      }
    }
    return true;
  },

  /**
   * true if all of the images are already downloaded.
   */
  get embeddedImagesDownloaded() {
    for (var i = 0; i < this._relatedParts.length; i++) {
      var relatedPart = this._relatedParts[i];
      if (!relatedPart.file)
        return false;
    }
    return true;
  },

  /**
   * Trigger the download of any inline images sent as part of the message.
   * Once the images have been downloaded, invoke the provided callback.
   */
  downloadEmbeddedImages: function(callWhenDone, callOnProgress) {
    var relPartIndices = [];
    for (var i = 0; i < this._relatedParts.length; i++) {
      var relatedPart = this._relatedParts[i];
      if (relatedPart.file)
        continue;
      relPartIndices.push(i);
    }
    if (!relPartIndices.length) {
      if (callWhenDone)
        callWhenDone();
      return;
    }
    this._api._downloadAttachments(this, relPartIndices, [], [],
                                   callWhenDone, callOnProgress);
  },

  /**
   * Synchronously trigger the display of embedded images.
   *
   * The loadCallback allows iframe resizing logic to fire once the size of the
   * image is known since Gecko still doesn't have seamless iframes.
   */
  showEmbeddedImages: function(htmlNode, loadCallback) {
    var i, cidToBlob = {};
    // - Generate object URLs for the attachments
    for (i = 0; i < this._relatedParts.length; i++) {
      var relPart = this._relatedParts[i];
      // Related parts should all be stored as Blobs-in-IndexedDB
      if (relPart.file && !Array.isArray(relPart.file))
        cidToBlob[relPart.contentId] = relPart.file;
    }

    // - Transform the links
    var nodes = htmlNode.querySelectorAll('.moz-embedded-image');
    for (i = 0; i < nodes.length; i++) {
      var node = nodes[i],
          cid = node.getAttribute('cid-src');

      if (!cidToBlob.hasOwnProperty(cid))
        continue;
      showBlobInImg(node, cidToBlob[cid]);
      if (loadCallback)
        node.addEventListener('load', loadCallback, false);

      node.removeAttribute('cid-src');
      node.classList.remove('moz-embedded-image');
    }
  },

  /**
   * @return[Boolean]{
   *   True if the given HTML node sub-tree contains references to externally
   *   hosted images.  These are detected by looking for markup left in the
   *   image by the sanitization process.  The markup is not guaranteed to be
   *   stable, so don't do this yourself.
   * }
   */
  checkForExternalImages: function(htmlNode) {
    var someNode = htmlNode.querySelector('.moz-external-image');
    return someNode !== null;
  },

  /**
   * Transform previously sanitized references to external images into live
   * references to images.  This un-does the operations of the sanitization step
   * using implementation-specific details subject to change, so don't do this
   * yourself.
   */
  showExternalImages: function(htmlNode, loadCallback) {
    // querySelectorAll is not live, whereas getElementsByClassName is; we
    // don't need/want live, especially with our manipulations.
    var nodes = htmlNode.querySelectorAll('.moz-external-image');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (loadCallback) {
        node.addEventListener('load', loadCallback, false);
      }
      node.setAttribute('src', node.getAttribute('ext-src'));
      node.removeAttribute('ext-src');
      node.classList.remove('moz-external-image');
    }
  },
  /**
   * Call this method when you are done with a message body.
   */
  die: function() {
    // Remember to cleanup event listeners except ondead!
    this.onchange = null;

    this._api.__bridgeSend({
      type: 'killBody',
      id: this.id,
      handle: this._handle
    });
  }
};

/**
 * Provides the file name, mime-type, and estimated file size of an attachment.
 * In the future this will also be the means for requesting the download of
 * an attachment or for attachment-forwarding semantics.
 */
function MailAttachment(_body, wireRep) {
  this._body = _body;
  this.partId = wireRep.part;
  this.filename = wireRep.name;
  this.mimetype = wireRep.type;
  this.sizeEstimateInBytes = wireRep.sizeEstimate;
  this._file = wireRep.file;

  // build a place for the DOM element and arbitrary data into our shape
  this.element = null;
  this.data = null;
}
MailAttachment.prototype = {
  toString: function() {
    return '[MailAttachment: "' + this.filename + '"]';
  },
  toJSON: function() {
    return {
      type: 'MailAttachment',
      filename: this.filename
    };
  },

  __update: function(wireRep) {
    this.mimetype = wireRep.type;
    this.sizeEstimateInBytes = wireRep.sizeEstimate;
    this._file = wireRep.file;
  },

  get isDownloaded() {
    return !!this._file;
  },

  /**
   * Is this attachment something we can download?  In almost all cases, the
   * answer is yes, regardless of network state.  The exception is that sent
   * POP3 messages do not retain their attachment Blobs and there is no way to
   * download them after the fact.
   */
  get isDownloadable() {
    return this.mimetype !== 'application/x-gelam-no-download';
  },

  /**
   * Queue this attachment for downloading.
   *
   * @param {Function} callWhenDone
   *     A callback to be invoked when the download completes.
   * @param {Function} callOnProgress
   *     A callback to be invoked as the download progresses.  NOT HOOKED UP!
   * @param {Boolean} [registerWithDownloadManager]
   *     Should we register the Blob with the mozDownloadManager (if it is
   *     present)?  For the Gaia mail app this decision is based on the
   *     capabilities of the default gaia apps, and not a decision easily made
   *     by GELAM.
   */
  download: function(callWhenDone, callOnProgress,
                     registerWithDownloadManager) {
    if (this.isDownloaded) {
      callWhenDone();
      return;
    }
    this._body._api._downloadAttachments(
      this._body, [], [this._body.attachments.indexOf(this)],
      [registerWithDownloadManager || false],
      callWhenDone, callOnProgress);
  },
};

/**
 * Undoable operations describe the operation that was performed for
 * presentation to the user and hold onto a handle that can be used to undo
 * whatever it was.  While the current UI plan does not call for the ability to
 * get a list of recently performed actions, the goal is to make it feasible
 * in the future.
 */
function UndoableOperation(_api, operation, affectedCount,
                           _tempHandle, _longtermIds) {
  this._api = _api;
  /**
   * @oneof[
   *   @case['read']{
   *     Marked message(s) as read.
   *   }
   *   @case['unread']{
   *     Marked message(s) as unread.
   *   }
   *   @case['star']{
   *     Starred message(s).
   *   }
   *   @case['unstar']{
   *     Unstarred message(s).
   *   }
   *   @case['addtag']{
   *     Added tag(s).
   *   }
   *   @case['removetag']{
   *     Removed tag(s).
   *   }
   *   @case['move']{
   *     Moved message(s).
   *   }
   *   @case['copy']{
   *     Copied message(s).
   *   }
   *   @case['delete']{
   *     Deleted message(s) by moving to trash folder.
   *   }
   * ]
   */
  this.operation = operation;
  /**
   * The number of messages affected by this operation.
   */
  this.affectedCount = affectedCount;

  /**
   * The temporary handle we use to refer to the operation immediately after
   * issuing it until we hear back from the mail bridge about its more permanent
   * _longtermIds.
   */
  this._tempHandle = _tempHandle;
  /**
   * The names of the per-account operations that this operation was mapped
   * to.
   */
  this._longtermIds = null;

  this._undoRequested = false;
}
UndoableOperation.prototype = {
  toString: function() {
    return '[UndoableOperation]';
  },
  toJSON: function() {
    return {
      type: 'UndoableOperation',
      handle: this._tempHandle,
      longtermIds: this._longtermIds,
    };
  },

  undo: function() {
    // We can't issue the undo until we've heard the longterm id, so just flag
    // it to be processed when we do.
    if (!this._longtermIds) {
      this._undoRequested = true;
      return;
    }
    this._api.__undo(this);
  },
};

/**
 * Ordered list collection abstraction where we may potentially only be viewing
 * a subset of the actual items in the collection.  This allows us to handle
 * lists with lots of items as well as lists where we have to retrieve data
 * from a remote server to populate the list.
 */
function BridgedViewSlice(api, ns, handle) {
  this._api = api;
  this._ns = ns;
  this._handle = handle;

  this.items = [];

  /**
   * @oneof[
   *   @case['new']{
   *     We were just created and have no meaningful state.
   *   }
   *   @case['synchronizing']{
   *     We are talking to a server to populate/expand the contents of this
   *     list.
   *   }
   *   @case['synced']{
   *     We successfully synchronized with the backing store/server.  If we are
   *     known to be offline and did not attempt to talk to the server, then we
   *     will still have this status.
   *   }
   *   @case['syncfailed']{
   *     We tried to synchronize with the server but failed.
   *   }
   * ]{
   *   Quasi-extensible indicator of whether we are synchronizing or not.  The
   *   idea is that if we are synchronizing, a spinner indicator can be shown
   *   at the end of the list of messages.
   * }
   */
  this.status = 'new';

  /**
   * A value in the range [0.0, 1.0] expressing our synchronization progress.
   */
  this.syncProgress = 0.0;

  /**
   * False if we can grow the slice in the negative direction without
   * requiring user prompting.
   */
  this.atTop = false;
  /**
   * False if we can grow the slice in the positive direction without
   * requiring user prompting.
   */
  this.atBottom = false;

  /**
   * Can we potentially grow the slice in the ngative direction if the user
   * requests it?  For example, triggering an IMAP sync for a part of the
   * time-range we have not previously synchronized.
   *
   * This is only really meaningful when `atTop` is true; if we are not at the
   * top, this value will be false.
   */
  this.userCanGrowUpwards = false;

  /**
   * Can we potentially grow the slice in the positive direction if the user
   * requests it?  For example, triggering an IMAP sync for a part of the
   * time-range we have not previously synchronized.
   *
   * This is only really meaningful when `atBottom` is true; if we are not at
   * the bottom, this value will be false.
   */
  this.userCanGrowDownwards = false;

  /**
   * Number of pending requests to the back-end.  To be used by logic that can
   * defer further requests until existing requests are complete.  For example,
   * infinite scrolling logic would do best to wait for the back-end to service
   * its requests before issuing new ones.
   */
  this.pendingRequestCount = 0;
  /**
   * The direction we are growing, if any (0 if not).
   */
  this._growing = 0;

  this.onadd = null;
  this.onchange = null;
  this.onsplice = null;
  this.onremove = null;
  this.onstatus = null;
  this.oncomplete = null;
  this.ondead = null;
}
BridgedViewSlice.prototype = {
  toString: function() {
    return '[BridgedViewSlice: ' + this._ns + ' ' + this._handle + ']';
  },
  toJSON: function() {
    return {
      type: 'BridgedViewSlice',
      namespace: this._ns,
      handle: this._handle
    };
  },

  /**
   * Tell the back-end we no longer need some of the items we know about.  This
   * will manifest as a requested splice at some point in the future, although
   * the back-end may attenuate partially or entirely.
   */
  requestShrinkage: function(firstUsedIndex, lastUsedIndex) {
    this.pendingRequestCount++;
    if (lastUsedIndex >= this.items.length)
      lastUsedIndex = this.items.length - 1;

    // We send indices and suid's.  The indices are used for fast-pathing;
    // if the suid's don't match, a linear search is undertaken.
    this._api.__bridgeSend({
        type: 'shrinkSlice',
        handle: this._handle,
        firstIndex: firstUsedIndex,
        firstSuid: this.items[firstUsedIndex].id,
        lastIndex: lastUsedIndex,
        lastSuid: this.items[lastUsedIndex].id
      });
  },

  /**
   * Request additional data in the given direction, optionally specifying that
   * some potentially costly growth of the data set should be performed.
   */
  requestGrowth: function(dirMagnitude, userRequestsGrowth) {
    if (this._growing)
      throw new Error('Already growing in ' + this._growing + ' dir.');
    this._growing = dirMagnitude;
    this.pendingRequestCount++;

    this._api.__bridgeSend({
        type: 'growSlice',
        dirMagnitude: dirMagnitude,
        userRequestsGrowth: userRequestsGrowth,
        handle: this._handle
      });
  },

  die: function() {
    // Null out all listeners except for the ondead listener.  This avoids
    // the callbacks from having to filter out messages from dead slices.
    this.onadd = null;
    this.onchange = null;
    this.onsplice = null;
    this.onremove = null;
    this.onstatus = null;
    this.oncomplete = null;
    this._api.__bridgeSend({
        type: 'killSlice',
        handle: this._handle
      });

    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      item.__die();
    }
  },
};

function AccountsViewSlice(api, handle) {
  BridgedViewSlice.call(this, api, 'accounts', handle);
}
AccountsViewSlice.prototype = Object.create(BridgedViewSlice.prototype);

/**
 * Return the account with the given ID, or null.
 */
AccountsViewSlice.prototype.getAccountById = function(id) {
  for (var i = 0; i < this.items.length; i++) {
    if (this.items[i]._wireRep.id === id) {
      return this.items[i];
    }
  }
  return null;
};

Object.defineProperty(AccountsViewSlice.prototype, 'defaultAccount', {
  get: function () {
    var defaultAccount = this.items[0];
    for (var i = 1; i < this.items.length; i++) {
      // For UI upgrades, the defaultPriority may not be set, so default to
      // zero for comparisons
      if ((this.items[i]._wireRep.defaultPriority || 0) >
          (defaultAccount._wireRep.defaultPriority || 0))
        defaultAccount = this.items[i];
    }

    return defaultAccount;
  }
});

function FoldersViewSlice(api, handle) {
  BridgedViewSlice.call(this, api, 'folders', handle);
}
FoldersViewSlice.prototype = Object.create(BridgedViewSlice.prototype);

FoldersViewSlice.prototype.getFirstFolderWithType = function(type, items) {
  // allow an explicit list of items to be provided, specifically for use in
  // onsplice handlers where the items have not yet been spliced in.
  if (!items)
    items = this.items;
  for (var i = 0; i < items.length; i++) {
    var folder = items[i];
    if (folder.type === type)
      return folder;
  }
  return null;
};

FoldersViewSlice.prototype.getFirstFolderWithName = function(name, items) {
  if (!items)
    items = this.items;
  for (var i = 0; i < items.length; i++) {
    var folder = items[i];
    if (folder.name === name)
      return folder;
  }
  return null;
};

FoldersViewSlice.prototype.getFirstFolderWithPath = function(path, items) {
  if (!items)
    items = this.items;
  for (var i = 0; i < items.length; i++) {
    var folder = items[i];
    if (folder.path === path)
      return folder;
  }
  return null;
};

function HeadersViewSlice(api, handle, ns) {
  BridgedViewSlice.call(this, api, ns || 'headers', handle);

  this._bodiesRequestId = 1;
  this._bodiesRequest = {};
}
HeadersViewSlice.prototype = Object.create(BridgedViewSlice.prototype);

/**
 * Request a re-sync of the time interval covering the effective time
 * range.  If the most recently displayed message is the most recent message
 * known to us, then the date range will cover through "now".  The refresh
 * mechanism will disable normal sync bisection limits, so take care to
 * `requestShrinkage` to a reasonable value if you have a ridiculous number of
 * headers currently present.
 */
HeadersViewSlice.prototype.refresh = function() {
  this._api.__bridgeSend({
      type: 'refreshHeaders',
      handle: this._handle
    });
};

HeadersViewSlice.prototype._notifyRequestBodiesComplete = function(reqId) {
  var callback = this._bodiesRequest[reqId];
  if (reqId && callback) {
    callback(true);
    delete this._bodiesRequest[reqId];
  }
};

/**
 * Requests bodies (if of a reasonable size) given a start/end position.
 *
 *    // start/end inclusive
 *    slice.maybeRequestBodies(5, 10);
 *
 * The results will be sent through the standard slice/header events.
 */
HeadersViewSlice.prototype.maybeRequestBodies =
  function(idxStart, idxEnd, options, callback) {

  if (typeof(options) === 'function') {
    callback = options;
    options = null;
  }

  var messages = [];

  idxEnd = Math.min(idxEnd, this.items.length - 1);

  for (; idxStart <= idxEnd; idxStart++) {
    var item = this.items[idxStart];
    // ns of 'headers' has the id/date on the item, where 'matchedHeaders'
    // has it on header.date
    if (this._ns === 'matchedHeaders') {
      item = item.header;
    }

    if (item && item.snippet === null) {
      messages.push({
        suid: item.id,
        // backend does not care about Date objects
        date: item.date.valueOf()
      });
    }
  }

  if (!messages.length)
    return callback && window.setZeroTimeout(callback, false);

  var reqId = this._bodiesRequestId++;
  this._bodiesRequest[reqId] = callback;

  this._api.__bridgeSend({
    type: 'requestBodies',
    handle: this._handle,
    requestId: reqId,
    messages: messages,
    options: options
  });
};


/**
 * Handle for a current/ongoing message composition process.  The UI reads state
 * out of the object when it resumes editing a draft, otherwise this can just be
 * treated as write-only.
 *
 * == Other clients and drafts:
 *
 * If another client deletes our draft out from under us, we currently won't
 * notice.
 */
function MessageComposition(api, handle) {
  this._api = api;
  this._handle = handle;

  this.senderIdentity = null;

  this.to = null;
  this.cc = null;
  this.bcc = null;

  this.subject = null;

  this.body = null;

  this._references = null;
  /**
   * @property attachments
   * @type Object[]
   *
   * A list of attachments currently attached or currently being attached with
   * the following attributes:
   * - name: The filename
   * - size: The size of the attachment payload in binary form.  This does not
   *   include transport encoding costs.
   *
   * Manipulating this list has no effect on reality; the methods addAttachment
   * and removeAttachment must be used.
   */
  this.attachments = null;

  this.hasDraft = false;
}
MessageComposition.prototype = {
  toString: function() {
    return '[MessageComposition: ' + this._handle + ']';
  },
  toJSON: function() {
    return {
      type: 'MessageComposition',
      handle: this._handle
    };
  },

  die: function() {
    if (this._handle) {
      this._api._composeDone(this._handle, 'die', null, null);
      this._handle = null;
    }
  },

  /**
   * Add an attachment to this composition.  This is an asynchronous process
   * that incrementally converts the Blob we are provided into a line-wrapped
   * base64-encoded message suitable for use in the rfc2822 message generation
   * process.  We will perform the conversion in slices whose sizes are
   * chosen to avoid causing a memory usage explosion that causes us to be
   * reaped.  Once the conversion is completed we will forget the Blob reference
   * provided to us.
   *
   * From the perspective of our drafts, an attachment is not fully attached
   * until it has been completely encoded, sliced, and persisted to our
   * IndexedDB database.  In the event of a crash during this time window,
   * the attachment will effectively have not been attached.  Our logic will
   * discard the partially-translated attachment when de-persisting the draft.
   * We will, however, create an entry in the attachments array immediately;
   * we also return it to you.  You should be able to safely call
   * removeAttachment with it regardless of what has happened on the backend.
   *
   * The caller *MUST* forget all references to the Blob that is being attached
   * after issuing this call.
   *
   * @args[
   *   @param[attachmentDef @dict[
   *     @key[name String]
   *     @key[blob Blob]
   *   ]]
   * ]
   */
  addAttachment: function(attachmentDef, callback) {
    // There needs to be a draft for us to attach things to.
    if (!this.hasDraft)
      this.saveDraft();
    this._api._composeAttach(this._handle, attachmentDef, callback);

    var placeholderAttachment = {
      name: attachmentDef.name,
      blob: {
        size: attachmentDef.blob.size,
        type: attachmentDef.blob.type
      }
    };
    this.attachments.push(placeholderAttachment);
    return placeholderAttachment;
  },

  /**
   * Remove an attachment previously requested to be added via `addAttachment`.
   *
   * @method removeAttachment
   * @param attachmentDef Object
   *   This must be one of the instances from our `attachments` list.  A
   *   logically equivalent object is no good.
   */
  removeAttachment: function(attachmentDef, callback) {
    var idx = this.attachments.indexOf(attachmentDef);
    if (idx !== -1) {
      this.attachments.splice(idx, 1);
      this._api._composeDetach(this._handle, idx, callback);
    }
  },

  /**
   * Populate our state to send over the wire to the back-end.
   */
  _buildWireRep: function() {
    return {
      senderId: this.senderIdentity.id,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      subject: this.subject,
      body: this.body,
      referencesStr: this._references,
      attachments: this.attachments,
    };
  },

  /**
   * Enqueue the message for sending. When the callback fires, the
   * message will be in the outbox, but will likely not have been sent yet.
   */
  finishCompositionSendMessage: function(callback) {
    this._api._composeDone(this._handle, 'send', this._buildWireRep(),
                           callback);
  },

  /**
   * Save the state of this composition.
   */
  saveDraft: function(callback) {
    this.hasDraft = true;
    this._api._composeDone(this._handle, 'save', this._buildWireRep(),
                           callback);
  },

  /**
   * The user has indicated they neither want to send nor save the draft.  We
   * want to delete the message so it is gone from everywhere.
   *
   * In the future, we might support some type of very limited undo
   * functionality, possibly on the UI side of the house.  This is not a secure
   * delete.
   */
  abortCompositionDeleteDraft: function(callback) {
    this._api._composeDone(this._handle, 'delete', null, callback);
  },

};

var LEGAL_CONFIG_KEYS = [];

/**
 * Error reporting helper; we will probably eventually want different behaviours
 * under development, under unit test, when in use by QA, advanced users, and
 * normal users, respectively.  By funneling all errors through one spot, we
 * help reduce inadvertent breakage later on.
 */
function reportError() {
  console.error.apply(console, arguments);
}
var unexpectedBridgeDataError = reportError,
    internalError = reportError,
    reportClientCodeError = reportError;


// Common idioms:
//
// Lead-in (URL and email):
// (                     Capture because we need to know if there was a lead-in
//                       character so we can include it as part of the text
//                       preceding the match.  We lack look-behind matching.
//  ^|                   The URL/email can start at the beginninf of the string.
//  [\s(,;]              Or whitespace or some punctuation that does not imply
//                       a context which would preclude a URL.
// )
//
// We do not need a trailing look-ahead because our regex's will terminate
// because they run out of characters they can eat.

// What we do not attempt to have the regexp do:
// - Avoid trailing '.' and ')' characters.  We let our greedy match absorb
//   these, but have a separate regex for extra characters to leave off at the
//   end.
//
// The Regex (apart from lead-in/lead-out):
// (                     Begin capture of the URL
//  (?:                  (potential detect beginnings)
//   https?:\/\/|        Start with "http" or "https"
//   www\d{0,3}[.][a-z0-9.\-]{2,249}|
//                      Start with "www", up to 3 numbers, then "." then
//                       something that looks domain-namey.  We differ from the
//                       next case in that we do not constrain the top-level
//                       domain as tightly and do not require a trailing path
//                       indicator of "/".  This is IDN root compatible.
//   [a-z0-9.\-]{2,250}[.][a-z]{2,4}\/
//                       Detect a non-www domain, but requiring a trailing "/"
//                       to indicate a path.  This only detects IDN domains
//                       with a non-IDN root.  This is reasonable in cases where
//                       there is no explicit http/https start us out, but
//                       unreasonable where there is.  Our real fix is the bug
//                       to port the Thunderbird/gecko linkification logic.
//
//                       Domain names can be up to 253 characters long, and are
//                       limited to a-zA-Z0-9 and '-'.  The roots don't have
//                       hyphens unless they are IDN roots.  Root zones can be
//                       found here: http://www.iana.org/domains/root/db
//  )
//  [-\w.!~*'();,/?:@&=+$#%]*
//                       path onwards. We allow the set of characters that
//                       encodeURI does not escape plus the result of escaping
//                       (so also '%')
// )
var RE_URL =
  /(^|[\s(,;])((?:https?:\/\/|www\d{0,3}[.][a-z0-9.\-]{2,249}|[a-z0-9.\-]{2,250}[.][a-z]{2,4}\/)[-\w.!~*'();,/?:@&=+$#%]*)/im;
// Set of terminators that are likely to have been part of the context rather
// than part of the URL and so should be uneaten.  This is the same as our
// mirror lead-in set (so '(', ',', ';') plus question end-ing punctuation and
// the potential permutations with parentheses (english-specific)
var RE_UNEAT_LAST_URL_CHARS = /(?:[),;.!?]|[.!?]\)|\)[.!?])$/;
// Don't require the trailing slashes here for pre-pending purposes, although
// our above regex currently requires them.
var RE_HTTP = /^https?:/i;
// Note: the [^\s] is fairly international friendly, but might be too friendly.
//
// Note: We've added support for IDN domains in the e-mail regexp.  We would
// expect optimal presentation of IDN-based e-mail addresses to be using HTML
// mails with an 'a' tag so that the human-readable address is present/visible,
// but we can't be sure of that.
//
// Brief analysis:
//   [a-z0-9.\-]{2,250}[.][a-z0-9\-]{2,32}
//                       Domain portion.  We have looser constraints on the
//                       root in terms of size since we already have the '@'
//                       giving us a high probability of an e-mail address.
//                       Otherwise we use the same base regexp from our URL
//                       logic.
var RE_MAIL =
  /(^|[\s(,;])([^(,;@\s]+@[a-z0-9.\-]{2,250}[.][a-z0-9\-]{2,32})/im;
var RE_MAILTO = /^mailto:/i;

var MailUtils = {

  /**
   * Linkify the given plaintext, producing an Array of HTML nodes as a result.
   */
  linkifyPlain: function(body, doc) {
    var nodes = [];
    var match = true, contentStart;
    while (true) {
      var url = RE_URL.exec(body);
      var email = RE_MAIL.exec(body);
      // Pick the regexp with the earlier content; index will always be zero.
      if (url &&
          (!email || url.index < email.index)) {
        contentStart = url.index + url[1].length;
        if (contentStart > 0)
          nodes.push(doc.createTextNode(body.substring(0, contentStart)));

        // There are some final characters for a URL that are much more likely
        // to have been part of the enclosing text rather than the end of the
        // URL.
        var useUrl = url[2];
        var uneat = RE_UNEAT_LAST_URL_CHARS.exec(useUrl);
        if (uneat) {
          useUrl = useUrl.substring(0, uneat.index);
        }

        var link = doc.createElement('a');
        link.className = 'moz-external-link';
        // the browser app needs us to put a protocol on the front
        if (RE_HTTP.test(url[2]))
          link.setAttribute('ext-href', useUrl);
        else
          link.setAttribute('ext-href', 'http://' + useUrl);
        var text = doc.createTextNode(useUrl);
        link.appendChild(text);
        nodes.push(link);

        body = body.substring(url.index + url[1].length + useUrl.length);
      }
      else if (email) {
        contentStart = email.index + email[1].length;
        if (contentStart > 0)
          nodes.push(doc.createTextNode(body.substring(0, contentStart)));

        link = doc.createElement('a');
        link.className = 'moz-external-link';
        if (RE_MAILTO.test(email[2]))
          link.setAttribute('ext-href', email[2]);
        else
          link.setAttribute('ext-href', 'mailto:' + email[2]);
        text = doc.createTextNode(email[2]);
        link.appendChild(text);
        nodes.push(link);

        body = body.substring(email.index + email[0].length);
      }
      else {
        break;
      }
    }

    if (body.length > 0)
      nodes.push(doc.createTextNode(body));

    return nodes;
  },

  /**
   * Process the document of an HTML iframe to linkify the text portions of the
   * HTML document.  'A' tags and their descendants are not linkified, nor
   * are the attributes of HTML nodes.
   */
  linkifyHTML: function(doc) {
    function linkElem(elem) {
      var children = elem.childNodes;
      for (var i in children) {
        var sub = children[i];
        if (sub.nodeName == '#text') {
          var nodes = MailUtils.linkifyPlain(sub.nodeValue, doc);

          elem.replaceChild(nodes[nodes.length-1], sub);
          for (var iNode = nodes.length-2; iNode >= 0; --iNode) {
            elem.insertBefore(nodes[iNode], nodes[iNode+1]);
          }
        }
        else if (sub.nodeName != 'A') {
          linkElem(sub);
        }
      }
    }

    linkElem(doc.body);
  },
};

/**
 * The public API exposed to the client via the MailAPI global.
 */
function MailAPI() {
  this._nextHandle = 1;

  this._slices = {};
  this._pendingRequests = {};
  this._liveBodies = {};
  /**
   * Functions to invoke to actually process/fire splices.  Exists to support
   * the fallout of waiting for contact resolution now that slice changes are
   * batched.
   */
  this._spliceFireFuncs = [];

  // Store bridgeSend messages received before back end spawns.
  this._storedSends = [];

  this._processingMessage = null;
  /**
   * List of received messages whose processing is being deferred because we
   * still have a message that is actively being processed, as stored in
   * `_processingMessage`.
   */
  this._deferredMessages = [];

  /**
   * @dict[
   *   @key[debugLogging]
   *   @key[checkInterval]
   * ]{
   *   Configuration data.  This is currently populated by data from
   *   `MailUniverse.exposeConfigForClient` by the code that constructs us.  In
   *   the future, we will probably want to ask for this from the `MailUniverse`
   *   directly over the wire.
   *
   *   This should be treated as read-only.
   * }
   */
  this.config = {};

  /**
   * @func[
   *   @args[
   *     @param[account MailAccount]
   *   ]
   * ]{
   *   A callback invoked when we fail to login to an account and the server
   *   explicitly told us the login failed and we have no reason to suspect
   *   the login was temporarily disabled.
   *
   *   The account is put in a disabled/offline state until such time as the
   *
   * }
   */
  this.onbadlogin = null;

  ContactCache.init();
}
exports.MailAPI = MailAPI;
MailAPI.prototype = {
  toString: function() {
    return '[MailAPI]';
  },
  toJSON: function() {
    return { type: 'MailAPI' };
  },

  utils: MailUtils,

  /**
   * Send a message over/to the bridge.  The idea is that we (can) communicate
   * with the backend using only a postMessage-style JSON channel.
   */
  __bridgeSend: function(msg) {
    // This method gets clobbered eventually once back end worker is ready.
    // Until then, it will store calls to send to the back end.

    this._storedSends.push(msg);
  },

  /**
   * Process a message received from the bridge.
   */
  __bridgeReceive: function ma___bridgeReceive(msg) {
    // Pong messages are used for tests
    if (this._processingMessage && msg.type !== 'pong') {
      this._deferredMessages.push(msg);
    }
    else {
      this._processMessage(msg);
    }
  },

  _processMessage: function ma__processMessage(msg) {
    var methodName = '_recv_' + msg.type;
    if (!(methodName in this)) {
      unexpectedBridgeDataError('Unsupported message type:', msg.type);
      return;
    }
    try {
      var done = this[methodName](msg);
      if (!done) {
        this._processingMessage = msg;
      }
    }
    catch (ex) {
      internalError('Problem handling message type:', msg.type, ex,
                    '\n', ex.stack);
      return;
    }
  },

  _doneProcessingMessage: function(msg) {
    if (this._processingMessage && this._processingMessage !== msg)
      throw new Error('Mismatched message completion!');

    this._processingMessage = null;
    while (this._processingMessage === null && this._deferredMessages.length) {
      this._processMessage(this._deferredMessages.shift());
    }
  },

  _recv_badLogin: function ma__recv_badLogin(msg) {
    if (this.onbadlogin)
      this.onbadlogin(new MailAccount(this, msg.account, null),
                      msg.problem,
                      msg.whichSide);
    return true;
  },

  _fireAllSplices: function() {
    for (var i = 0; i < this._spliceFireFuncs.length; i++) {
      var fireSpliceData = this._spliceFireFuncs[i];
      fireSpliceData();
    }

    this._spliceFireFuncs.length = 0;
  },

  _recv_batchSlice: function receiveBatchSlice(msg) {
    var slice = this._slices[msg.handle];
    if (!slice) {
      unexpectedBridgeDataError("Received message about nonexistent slice:", msg.handle);
      return true;
    }

    var updateStatus = this._updateSliceStatus(msg, slice);
    for (var i = 0; i < msg.sliceUpdates.length; i++) {
      var update = msg.sliceUpdates[i];
      if (update.type === 'update') {
        // Updates are identified by their index position, so they need to be
        // processed in the same order we're hearing about them.
        this._spliceFireFuncs.push(
          this._processSliceUpdate.bind(this, msg, update.updates, slice));
      } else {
        // Added items are transformed immediately, but the actual mutation of
        // the slice and notifications do not fire until _fireAllSplices().
        this._transformAndEnqueueSingleSplice(msg, update, slice);
      }
    }

    // If there are pending contact resolutions, we need to wait them to
    // complete before processing and firing the splices.
    if (ContactCache.pendingLookupCount) {
      ContactCache.callbacks.push(function contactsResolved() {
        this._fireAllSplices();
        this._fireStatusNotifications(updateStatus, slice);
        this._doneProcessingMessage(msg);
      }.bind(this));
      // (Wait for us to call _doneProcessingMessage before processing the next
      // message.  This also means this method will only push one callback.)
      return false;
    }

    this._fireAllSplices();
    this._fireStatusNotifications(updateStatus, slice);
    return true; // All done processing; feel free to process the next msg.
  },

  _fireStatusNotifications: function (updateStatus, slice) {
    if (updateStatus && slice.onstatus) {
      slice.onstatus(slice.status);
    }
  },

  _updateSliceStatus: function(msg, slice) {
    // - generate namespace-specific notifications
    slice.atTop = msg.atTop;
    slice.atBottom = msg.atBottom;
    slice.userCanGrowUpwards = msg.userCanGrowUpwards;
    slice.userCanGrowDownwards = msg.userCanGrowDownwards;

    // Have to update slice status before we actually do the work
    var generatedStatusChange = (msg.status &&
      (slice.status !== msg.status ||
      slice.syncProgress !== msg.progress));

    if (msg.status) {
      slice.status = msg.status;
      slice.syncProgress = msg.syncProgress;
    }

    return generatedStatusChange;
  },

  _processSliceUpdate: function (msg, splice, slice) {
    try {
      for (var i = 0; i < splice.length; i += 2) {
        var idx = splice[i], wireRep = splice[i + 1],
            itemObj = slice.items[idx];
        itemObj.__update(wireRep);
        if (slice.onchange) {
          slice.onchange(itemObj, idx);
        }
        if (itemObj.onchange) {
          itemObj.onchange(itemObj, idx);
        }
      }
    }
    catch (ex) {
      reportClientCodeError('onchange notification error', ex,
                            '\n', ex.stack);
    }
  },

  /**
   * Transform the slice splice (for contact-resolution side-effects) and
   * enqueue the eventual processing and firing of the splice once all contacts
   * have been resolved.
   */
  _transformAndEnqueueSingleSplice: function(msg, splice, slice) {
   var transformedItems = this._transform_sliceSplice(splice, slice);
   var fake = false;
    // It's possible that a transformed representation is depending on an async
    // call to mozContacts.  In this case, we don't want to surface the data to
    // the UI until the contacts are fully resolved in order to avoid the UI
    // flickering or just triggering reflows that could otherwise be avoided.
    // Since we could be processing multiple updates, just batch everything here
    // and we'll check later to see if any of our splices requires a contact
    // lookup
    this._spliceFireFuncs.push(function singleSpliceUpdate() {
      this._fireSplice(splice, slice, transformedItems, fake);
    }.bind(this));
  },

  /**
   * Perform the actual splice, generating notifications.
   */
  _fireSplice: function(splice, slice, transformedItems, fake) {
    var i, stopIndex, items, tempMsg;

    // - update header count, but only if the splice tracks a
    // headerCount.
    if (splice.headerCount !== undefined) {
      slice.headerCount = splice.headerCount;
    }

    // - generate slice 'onsplice' notification
    if (slice.onsplice) {
      try {
        slice.onsplice(splice.index, splice.howMany, transformedItems,
                       splice.requested, splice.moreExpected, fake);
      }
      catch (ex) {
        reportClientCodeError('onsplice notification error', ex,
                              '\n', ex.stack);
      }
    }
    // - generate item 'onremove' notifications
    if (splice.howMany) {
      try {
        stopIndex = splice.index + splice.howMany;
        for (i = splice.index; i < stopIndex; i++) {
          var item = slice.items[i];
          if (slice.onremove)
            slice.onremove(item, i);
          if (item.onremove)
            item.onremove(item, i);
          // the item needs a chance to clean up after itself.
          item.__die();
        }
      }
      catch (ex) {
        reportClientCodeError('onremove notification error', ex,
                              '\n', ex.stack);
      }
    }
    // - perform actual splice
    slice.items.splice.apply(
      slice.items,
      [splice.index, splice.howMany].concat(transformedItems));

    // - generate item 'onadd' notifications
    if (slice.onadd) {
      try {
        stopIndex = splice.index + transformedItems.length;
        for (i = splice.index; i < stopIndex; i++) {
          slice.onadd(slice.items[i], i);
        }
      }
      catch (ex) {
        reportClientCodeError('onadd notification error', ex,
                              '\n', ex.stack);
      }
    }

    // - generate 'oncomplete' notification
    if (splice.requested && !splice.moreExpected) {
      slice._growing = 0;
      if (slice.pendingRequestCount)
        slice.pendingRequestCount--;

      if (slice.oncomplete) {
        var completeFunc = slice.oncomplete;
        // reset before calling in case it wants to chain.
        slice.oncomplete = null;
        try {
          // Maybe defer here?
          completeFunc(splice.newEmailCount);
        }
        catch (ex) {
          reportClientCodeError('oncomplete notification error', ex,
                                '\n', ex.stack);
        }
      }
    }
  },

  _transform_sliceSplice: function ma__transform_sliceSplice(splice, slice) {
    var addItems = splice.addItems, transformedItems = [], i;
    switch (slice._ns) {
      case 'accounts':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailAccount(this, addItems[i], slice));
        }
        break;

      case 'identities':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailSenderIdentity(this, addItems[i]));
        }
        break;

      case 'folders':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailFolder(this, addItems[i]));
        }
        break;

      case 'headers':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailHeader(slice, addItems[i]));
        }
        break;

      case 'matchedHeaders':
        for (i = 0; i < addItems.length; i++) {
          transformedItems.push(new MailMatchedHeader(slice, addItems[i]));
        }
        break;


      default:
        console.error('Slice notification for unknown type:', slice._ns);
        break;
    }

    return transformedItems;
  },

  _recv_sliceDead: function(msg) {
    var slice = this._slices[msg.handle];
    delete this._slices[msg.handle];
    if (slice.ondead)
      slice.ondead(slice);
    slice.ondead = null;

    return true;
  },

  _getBodyForMessage: function(header, options, callback) {
    var downloadBodyReps = false, withBodyReps = false;

    if (options && options.downloadBodyReps) {
      downloadBodyReps = options.downloadBodyReps;
    }
    if (options && options.withBodyReps) {
      withBodyReps = options.withBodyReps;
    }

    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'getBody',
      suid: header.id,
      callback: callback
    };
    this.__bridgeSend({
      type: 'getBody',
      handle: handle,
      suid: header.id,
      date: header.date.valueOf(),
      downloadBodyReps: downloadBodyReps,
      withBodyReps: withBodyReps
    });
  },

  _recv_gotBody: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for got body:', msg.handle);
      return true;
    }
    delete this._pendingRequests[msg.handle];

    var body = msg.bodyInfo ?
      new MailBody(this, req.suid, msg.bodyInfo, msg.handle) :
      null;

    if (body) {
      this._liveBodies[msg.handle] = body;
    }

    req.callback.call(null, body, req.suid);

    return true;
  },

  _recv_requestBodiesComplete: function(msg) {
    var slice = this._slices[msg.handle];
    // The slice may be dead now!
    if (slice)
      slice._notifyRequestBodiesComplete(msg.requestId);

    return true;
  },

  _recv_bodyModified: function(msg) {
    var body = this._liveBodies[msg.handle];

    if (!body) {
      unexpectedBridgeDataError('body modified for dead handle', msg.handle);
      // possible but very unlikely race condition where body is modified while
      // we are removing the reference to the observer...
      return true;
    }

    var wireRep = msg.bodyInfo;
    // We update the body representation regardless of whether there is an
    // onchange listener because the body may contain Blob handles that need to
    // be updated so that in-memory blobs that have been superseded by on-disk
    // Blobs can be garbage collected.
    body.__update(wireRep, msg.detail);

    if (body.onchange) {
      body.onchange(
        msg.detail,
        body
      );
    }

    return true;
  },

  _recv_bodyDead: function(msg) {
    var body = this._liveBodies[msg.handle];

    if (body && body.ondead) {
      body.ondead();
    }

    delete this._liveBodies[msg.handle];
    return true;
  },

  _downloadAttachments: function(body, relPartIndices, attachmentIndices,
                                 registerAttachments,
                                 callWhenDone, callOnProgress) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'downloadAttachments',
      body: body,
      relParts: relPartIndices.length > 0,
      attachments: attachmentIndices.length > 0,
      callback: callWhenDone,
      progress: callOnProgress
    };
    this.__bridgeSend({
      type: 'downloadAttachments',
      handle: handle,
      suid: body.id,
      date: body._date,
      relPartIndices: relPartIndices,
      attachmentIndices: attachmentIndices,
      registerAttachments: registerAttachments
    });
  },

  _recv_downloadedAttachments: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for got body:', msg.handle);
      return true;
    }
    delete this._pendingRequests[msg.handle];

    // We used to update the attachment representations here.  This is now
    // handled by `bodyModified` notifications which are guaranteed to occur
    // prior to this callback being invoked.

    if (req.callback)
      req.callback.call(null, req.body);
    return true;
  },

  /**
   * Given a user's email address, try and see if we can autoconfigure the
   * account and what information we'll need to configure it, specifically
   * a password or if XOAuth2 credentials will be needed.
   *
   * @param {Object} details
   * @param {String} details.emailAddress
   *   The user's email address.
   * @param {Function} callback
   *   Invoked once we have an answer.  The object will look something like
   *   one of the following results:
   *
   *   No autoconfig information is available and the user has to do manual
   *   setup:
   *
   *     {
   *       result: 'no-config-info',
   *       configInfo: null
   *     }
   *
   *   Autoconfig information is available and to complete the autoconfig
   *   we need the user's password.  For IMAP and POP3 this means we know
   *   everything we need and can actually create the account.  For ActiveSync
   *   we actually need the password to try and perform autodiscovery.
   *
   *     {
   *       result: 'need-password',
   *       configInfo: { incoming, outgoing }
   *     }
   *
   *   Autoconfig information is available and XOAuth2 authentication should
   *   be attempted and those credentials then provided to us.
   *
   *     {
   *       result: 'need-oauth2',
   *       configInfo: {
   *         incoming,
   *         outgoing,
   *         oauth2Settings: {
   *           secretGroup: 'google' or 'microsoft' or other arbitrary string,
   *           authEndpoint: 'url to the auth endpoint',
   *           tokenEndpoint: 'url to where you ask for tokens',
   *           scope: 'space delimited list of scopes to request'
   *         }
   *       }
   *     }
   *
   *   A `source` property will also be present in the result object.  Its
   *   value will be one of: 'hardcoded', 'local', 'ispdb',
   *   'autoconfig-subdomain', 'autoconfig-wellknown', 'mx local', 'mx ispdb',
   *   'autodiscover'.
   */
  learnAboutAccount: function(details, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'learnAboutAccount',
      details: details,
      callback: callback
    };
    this.__bridgeSend({
      type: 'learnAboutAccount',
      handle: handle,
      details: details
    });
  },

  _recv_learnAboutAccountResults: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle:', msg.handle);
      return true;
    }
    delete this._pendingRequests[msg.handle];

    req.callback.call(null, msg.data);
    return true;
  },


  /**
   * Try to create an account.  There is currently no way to abort the process
   * of creating an account.  You really want to use learnAboutAccount before
   * you call this unless you are an automated test.
   *
   * @typedef[AccountCreationError @oneof[
   *   @case['offline']{
   *     We are offline and have no network access to try and create the
   *     account.
   *   }
   *   @case['no-dns-entry']{
   *     We couldn't find the domain name in question, full stop.
   *
   *     Not currently generated; eventually desired because it suggests a typo
   *     and so a specialized error message is useful.
   *   }
   *   @case['no-config-info']{
   *     We were unable to locate configuration information for the domain.
   *   }
   *   @case['unresponsive-server']{
   *     Requests to the server timed out.  AKA we sent packets into a black
   *     hole.
   *   }
   *   @case['port-not-listening']{
   *     Attempts to connect to the given port on the server failed.  We got
   *     packets back rejecting our connection.
   *
   *     Not currently generated; primarily desired because it is very useful if
   *     we are domain guessing.  Also desirable for error messages because it
   *     suggests a user typo or the less likely server outage.
   *   }
   *   @case['bad-security']{
   *     We were able to connect to the port and initiate TLS, but we didn't
   *     like what we found.  This could be a mismatch on the server domain,
   *     a self-signed or otherwise invalid certificate, insufficient crypto,
   *     or a vulnerable server implementation.
   *   }
   *   @case['bad-user-or-pass']{
   *     The username and password didn't check out.  We don't know which one
   *     is wrong, just that one of them is wrong.
   *   }
   *   @case['bad-address']{
   *     The e-mail address provided was rejected by the SMTP probe.
   *   }
   *   @case['pop-server-not-great']{
   *     The POP3 server doesn't support IDLE and TOP, so we can't use it.
   *   }
   *   @case['imap-disabled']{
   *     IMAP support is not enabled for the Gmail account in use.
   *   }
   *   @case['pop3-disabled']{
   *     POP3 support is not enabled for the Gmail account in use.
   *   }
   *   @case['needs-oauth-reauth']{
   *     The OAUTH refresh token was invalid, or there was some problem with
   *     the OAUTH credentials provided. The user needs to go through the
   *     OAUTH flow again.
   *   }
   *   @case['not-authorized']{
   *     The username and password are correct, but the user isn't allowed to
   *     access the mail server.
   *   }
   *   @case['server-problem']{
   *     We were able to talk to the "server" named in the details object, but
   *     we encountered some type of problem.  The details object will also
   *     include a "status" value.
   *   }
   *   @case['server-maintenance']{
   *     The server appears to be undergoing maintenance, at least for this
   *     account.  We infer this if the server is telling us that login is
   *     disabled in general or when we try and login the message provides
   *     positive indications of some type of maintenance rather than a
   *     generic error string.
   *   }
   *   @case['user-account-exists']{
   *     If the user tries to create an account which is already configured.
   *     Should not be created. We will show that account is already configured
   *   }
   *   @case['unknown']{
   *     We don't know what happened; count this as our bug for not knowing.
   *   }
   *   @case[null]{
   *     No error, the account was created and everything is terrific.
   *   }
   * ]]
   *
   * @param {Object} details
   * @param {String} details.emailAddress
   * @param {String} [details.password]
   *   The user's password
   * @param {Object} [configInfo]
   *   If continuing an autoconfig initiated by learnAboutAccount, the
   *   configInfo it returned as part of its results, although you will need
   *   to poke the following structured properties in if you're doing the oauth2
   *   thing:
   *
   *     {
   *       oauth2Secrets: { clientId, clientSecret }
   *       oauth2Tokens: { accessToken, refreshToken, expireTimeMS }
   *     }
   *
   *   If performing a manual config, a manually created configInfo object of
   *   the following form:
   *
   *     {
   *       incoming: { hostname, port, socketType, username, password }
   *       outgoing: { hostname, port, socketType, username, password }
   *     }
   *
   *
   *
   * @param {Function} callback
   *   The callback to invoke upon success or failure.  The callback will be
   *   called with 2 arguments in the case of failure: the error string code,
   *   and the error details object.
   *
   *
   * @args[
   *   @param[details @dict[
   *     @key[displayName String]{
   *       The name the (human, per EULA) user wants to be known to the world
   *       as.
   *     }
   *     @key[emailAddress String]
   *     @key[password String]
   *   ]]
   *   @param[callback @func[
   *     @args[
   *       @param[err AccountCreationError]
   *       @param[errDetails @dict[
   *         @key[server #:optional String]{
   *           The server we had trouble talking to.
   *         }
   *         @key[status #:optional @oneof[Number String]]{
   *           The HTTP status code number, or "timeout", or something otherwise
   *           providing detailed additional information about the error.  This
   *           is usually too technical to be presented to the user, but is
   *           worth encoding with the error name proper if possible.
   *         }
   *       ]]
   *     ]
   *   ]
   * ]
   */
  tryToCreateAccount: function ma_tryToCreateAccount(details, domainInfo,
                                                     callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'tryToCreateAccount',
      details: details,
      domainInfo: domainInfo,
      callback: callback
    };
    this.__bridgeSend({
      type: 'tryToCreateAccount',
      handle: handle,
      details: details,
      domainInfo: domainInfo
    });
  },

  _recv_tryToCreateAccountResults:
      function ma__recv_tryToCreateAccountResults(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for create account:', msg.handle);
      return true;
    }
    delete this._pendingRequests[msg.handle];

    // We create this account to expose modifications functions to the
    // frontend before we have access to the full accounts slice.  Note that
    // we may not have an account if we failed to create the account!
    var account;
    if (msg.account) {
      account = new MailAccount(this, msg.account, null);
    }

    req.callback.call(null, msg.error, msg.errorDetails, account);
    return true;
  },

  _clearAccountProblems: function ma__clearAccountProblems(account, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'clearAccountProblems',
      callback: callback,
    };
    this.__bridgeSend({
      type: 'clearAccountProblems',
      accountId: account.id,
      handle: handle,
    });
  },

  _recv_clearAccountProblems: function ma__recv_clearAccountProblems(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback && req.callback();
    return true;
  },

  _modifyAccount: function ma__modifyAccount(account, mods, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'modifyAccount',
      callback: callback,
    };
    this.__bridgeSend({
      type: 'modifyAccount',
      accountId: account.id,
      mods: mods,
      handle: handle
    });
  },

  _recv_modifyAccount: function(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback && req.callback();
    return true;
  },

  _deleteAccount: function ma__deleteAccount(account) {
    this.__bridgeSend({
      type: 'deleteAccount',
      accountId: account.id,
    });
  },

  _modifyIdentity: function ma__modifyIdentity(identity, mods, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'modifyIdentity',
      callback: callback,
    };
    this.__bridgeSend({
      type: 'modifyIdentity',
      identityId: identity.id,
      mods: mods,
      handle: handle
    });
  },

  _recv_modifyIdentity: function(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback && req.callback();
    return true;
  },

  /**
   * Get the list of accounts.  This can be used for the list of accounts in
   * setttings or for a folder tree where only one account's folders are visible
   * at a time.
   *
   * @args[
   *   @param[realAccountsOnly Boolean]{
   *     Should we only list real accounts (aka not unified accounts)?  This is
   *     meaningful for the settings UI and for the move-to-folder UI where
   *     selecting a unified account's folders is useless.
   *   }
   * ]
   */
  viewAccounts: function ma_viewAccounts(realAccountsOnly) {
    var handle = this._nextHandle++,
        slice = new AccountsViewSlice(this, handle);
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewAccounts',
      handle: handle,
    });
    return slice;
  },

  /**
   * Get the list of sender identities.  The identities can also be found on
   * their owning accounts via `viewAccounts`.
   */
  viewSenderIdentities: function ma_viewSenderIdentities() {
    var handle = this._nextHandle++,
        slice = new BridgedViewSlice(this, 'identities', handle);
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewSenderIdentities',
      handle: handle,
    });
    return slice;
  },

  /**
   * Retrieve the entire folder hierarchy for either 'navigation' (pick what
   * folder to show the contents of, including unified folders), 'movetarget'
   * (pick target folder for moves, does not include unified folders), or
   * 'account' (only show the folders belonging to a given account, implies
   * selection).  In all cases, there may exist non-selectable folders such as
   * the account roots or IMAP folders that cannot contain messages.
   *
   * When accounts are presented as folders via this UI, they do not expose any
   * of their `MailAccount` semantics.
   *
   * @args[
   *   @param[mode @oneof['navigation' 'movetarget' 'account']
   *   @param[argument #:optional]{
   *     Arguent appropriate to the mode; currently will only be a `MailAccount`
   *     instance.
   *   }
   * ]
   */
  viewFolders: function ma_viewFolders(mode, argument) {
    var handle = this._nextHandle++,
        slice = new FoldersViewSlice(this, handle);

    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewFolders',
      mode: mode,
      handle: handle,
      argument: argument ? argument.id : null,
    });

    return slice;
  },

  /**
   * Retrieve a slice of the contents of a folder, starting from the most recent
   * messages.
   */
  viewFolderMessages: function ma_viewFolderMessages(folder) {
    var handle = this._nextHandle++,
        slice = new HeadersViewSlice(this, handle);
    slice.folderId = folder.id;
    // the initial population counts as a request.
    slice.pendingRequestCount++;
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'viewFolderMessages',
      folderId: folder.id,
      handle: handle,
    });

    return slice;
  },

  /**
   * Search a folder for messages containing the given text in the sender,
   * recipients, or subject fields, as well as (optionally), the body with a
   * default time constraint so we don't entirely kill the server or us.
   *
   * @args[
   *   @param[folder]{
   *     The folder whose messages we should search.
   *   }
   *   @param[text]{
   *     The phrase to search for.  We don't split this up into words or
   *     anything like that.  We just do straight-up indexOf on the whole thing.
   *   }
   *   @param[whatToSearch @dict[
   *     @key[author #:optional Boolean]
   *     @key[recipients #:optional Boolean]
   *     @key[subject #:optional Boolean]
   *     @key[body #:optional @oneof[false 'no-quotes' 'yes-quotes']]
   *   ]]
   * ]
   */
  searchFolderMessages:
      function ma_searchFolderMessages(folder, text, whatToSearch) {
    var handle = this._nextHandle++,
        slice = new HeadersViewSlice(this, handle, 'matchedHeaders');
    // the initial population counts as a request.
    slice.pendingRequestCount++;
    this._slices[handle] = slice;

    this.__bridgeSend({
      type: 'searchFolderMessages',
      folderId: folder.id,
      handle: handle,
      phrase: text,
      whatToSearch: whatToSearch,
    });

    return slice;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Batch Message Mutation
  //
  // If you want to modify a single message, you can use the methods on it
  // directly.
  //
  // All actions are undoable and return an `UndoableOperation`.

  deleteMessages: function ma_deleteMessages(messages) {
    // We allocate a handle that provides a temporary name for our undoable
    // operation until we hear back from the other side about it.
    var handle = this._nextHandle++;

    var undoableOp = new UndoableOperation(this, 'delete', messages.length,
                                           handle),
        msgSuids = messages.map(serializeMessageName);

    this._pendingRequests[handle] = {
      type: 'mutation',
      handle: handle,
      undoableOp: undoableOp
    };
    this.__bridgeSend({
      type: 'deleteMessages',
      handle: handle,
      messages: msgSuids,
    });

    return undoableOp;
  },

  // Copying messages is not required yet.
  /*
  copyMessages: function ma_copyMessages(messages, targetFolder) {
  },
  */

  moveMessages: function ma_moveMessages(messages, targetFolder, callback) {
    // We allocate a handle that provides a temporary name for our undoable
    // operation until we hear back from the other side about it.
    var handle = this._nextHandle++;

    var undoableOp = new UndoableOperation(this, 'move', messages.length,
                                           handle),
        msgSuids = messages.map(serializeMessageName);

    this._pendingRequests[handle] = {
      type: 'mutation',
      handle: handle,
      undoableOp: undoableOp,
      callback: callback
    };
    this.__bridgeSend({
      type: 'moveMessages',
      handle: handle,
      messages: msgSuids,
      targetFolder: targetFolder.id
    });

    return undoableOp;
  },

  markMessagesRead: function ma_markMessagesRead(messages, beRead) {
    return this.modifyMessageTags(messages,
                                  beRead ? ['\\Seen'] : null,
                                  beRead ? null : ['\\Seen'],
                                  beRead ? 'read' : 'unread');
  },

  markMessagesStarred: function ma_markMessagesStarred(messages, beStarred) {
    return this.modifyMessageTags(messages,
                                  beStarred ? ['\\Flagged'] : null,
                                  beStarred ? null : ['\\Flagged'],
                                  beStarred ? 'star' : 'unstar');
  },

  modifyMessageTags: function ma_modifyMessageTags(messages, addTags,
                                                   removeTags, _opcode) {
    // We allocate a handle that provides a temporary name for our undoable
    // operation until we hear back from the other side about it.
    var handle = this._nextHandle++;

    if (!_opcode) {
      if (addTags && addTags.length)
        _opcode = 'addtag';
      else if (removeTags && removeTags.length)
        _opcode = 'removetag';
    }
    var undoableOp = new UndoableOperation(this, _opcode, messages.length,
                                           handle),
        msgSuids = messages.map(serializeMessageName);

    this._pendingRequests[handle] = {
      type: 'mutation',
      handle: handle,
      undoableOp: undoableOp
    };
    this.__bridgeSend({
      type: 'modifyMessageTags',
      handle: handle,
      opcode: _opcode,
      addTags: addTags,
      removeTags: removeTags,
      messages: msgSuids,
    });

    return undoableOp;
  },

  /**
   * Check the outbox for pending messages, and initiate a series of
   * jobs to attempt to send them. The callback fires after the first
   * message's send attempt completes; this job will then
   * self-schedule further jobs to attempt to send the rest of the
   * outbox.
   *
   * @param {MailAccount} account
   * @param {function} callback
   *   Called after the first message's send attempt finishes.
   */
  sendOutboxMessages: function (account, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'sendOutboxMessages',
      callback: callback
    };
    this.__bridgeSend({
      type: 'sendOutboxMessages',
      accountId: account.id,
      handle: handle
    });
  },

  _recv_sendOutboxMessages: function(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback && req.callback();
    return true;
  },

  /**
   * Enable or disable outbox syncing for this account. This is
   * generally a temporary measure, used when the user is actively
   * editing the list of outbox messages and we don't want to
   * inadvertently move something out from under them. This change
   * does _not_ persist; it's meant to be used only for brief periods
   * of time, not as a "sync schedule" coordinator.
   */
  setOutboxSyncEnabled: function (account, enabled, callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'setOutboxSyncEnabled',
      callback: callback
    };
    this.__bridgeSend({
      type: 'setOutboxSyncEnabled',
      accountId: account.id,
      outboxSyncEnabled: enabled,
      handle: handle
    });
  },

  _recv_setOutboxSyncEnabled: function(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback && req.callback();
    return true;
  },

  /**
   * Parse a structured email address
   * into a display name and email address parts.
   * It will return null on a parse failure.
   *
   * @param {String} email A email address.
   * @return {Object} An object of the form { name, address }.
   */
  parseMailbox: function(email) {
    try {
      var mailbox = addressparser.parse(email);
      return (mailbox.length >= 1) ? mailbox[0] : null;
    }
    catch (ex) {
      reportClientCodeError('parse mailbox error', ex,
                            '\n', ex.stack);
      return null;
    }
  },

  _recv_mutationConfirmed: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for mutation:', msg.handle);
      return true;
    }

    req.undoableOp._tempHandle = null;
    req.undoableOp._longtermIds = msg.longtermIds;
    if (req.undoableOp._undoRequested)
      req.undoableOp.undo();

    if (req.callback) {
      req.callback(msg.result);
    }

    return true;
  },

  __undo: function undo(undoableOp) {
    this.__bridgeSend({
      type: 'undo',
      longtermIds: undoableOp._longtermIds,
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // Contact Support

  resolveEmailAddressToPeep: function(emailAddress, callback) {
    var peep = ContactCache.resolvePeep({ name: null, address: emailAddress });
    if (ContactCache.pendingLookupCount)
      ContactCache.callbacks.push(callback.bind(null, peep));
    else
      callback(peep);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Composition

  /**
   * Begin the message composition process, creating a MessageComposition that
   * stores the current message state and periodically persists its state to the
   * backend so that the message is potentially available to other clients and
   * recoverable in the event of a local crash.
   *
   * Composition is triggered in the context of a given message and folder so
   * that the correct account and sender identity for composition can be
   * inferred.  Message may be null if there are no messages in the folder.
   * Folder is not required if a message is provided.
   *
   * @args[
   *   @param[message #:optional MailHeader]{
   *     Some message to use as context when not issuing a reply/forward.
   *   }
   *   @param[folder #:optional MailFolder]{
   *     The folder to use as context if no `message` is provided and not
   *     issuing a reply/forward.
   *   }
   *   @param[options #:optional @dict[
   *     @key[replyTo #:optional MailHeader]
   *     @key[replyMode #:optional @oneof[null 'list' 'all']]
   *     @key[forwardOf #:optional MailHeader]
   *     @key[forwardMode #:optional @oneof['inline']]
   *   ]]
   *   @param[callback #:optional Function]{
   *     The callback to invoke once the composition handle is fully populated.
   *     This is necessary because the back-end decides what identity is
   *     appropriate, handles "re:" prefixing, quoting messages, etc.
   *   }
   * ]
   */
  beginMessageComposition: function(message, folder, options, callback) {
    if (!callback)
      throw new Error('A callback must be provided; you are using the API ' +
                      'wrong if you do not.');
    if (!options)
      options = {};

    var handle = this._nextHandle++,
        composer = new MessageComposition(this, handle);

    this._pendingRequests[handle] = {
      type: 'compose',
      composer: composer,
      callback: callback,
    };
    var msg = {
      type: 'beginCompose',
      handle: handle,
      mode: null,
      submode: null,
      refSuid: null,
      refDate: null,
      refGuid: null,
      refAuthor: null,
      refSubject: null,
    };
    if (options.hasOwnProperty('replyTo') && options.replyTo) {
      msg.mode = 'reply';
      msg.submode = options.replyMode;
      msg.refSuid = options.replyTo.id;
      msg.refDate = options.replyTo.date.valueOf();
      msg.refGuid = options.replyTo.guid;
      msg.refAuthor = options.replyTo.author.toWireRep();
      msg.refSubject = options.replyTo.subject;
    }
    else if (options.hasOwnProperty('forwardOf') && options.forwardOf) {
      msg.mode = 'forward';
      msg.submode = options.forwardMode;
      msg.refSuid = options.forwardOf.id;
      msg.refDate = options.forwardOf.date.valueOf();
      msg.refGuid = options.forwardOf.guid;
      msg.refAuthor = options.forwardOf.author.toWireRep();
      msg.refSubject = options.forwardOf.subject;
    }
    else {
      msg.mode = 'new';
      if (message) {
        msg.submode = 'message';
        msg.refSuid = message.id;
      }
      else if (folder) {
        msg.submode = 'folder';
        msg.refSuid = folder.id;
      }
    }
    this.__bridgeSend(msg);
    return composer;
  },

  /**
   * Open a message as if it were a draft message (hopefully it is), returning
   * a MessageComposition object that will be asynchronously populated.  The
   * provided callback will be notified once all composition state has been
   * loaded.
   *
   * The underlying message will be replaced by other messages as the draft
   * is updated and effectively deleted once the draft is completed.  (A
   * move may be performed instead.)
   */
  resumeMessageComposition: function(message, callback) {
    if (!callback)
      throw new Error('A callback must be provided; you are using the API ' +
                      'wrong if you do not.');

    var handle = this._nextHandle++,
        composer = new MessageComposition(this, handle);

    this._pendingRequests[handle] = {
      type: 'compose',
      composer: composer,
      callback: callback,
    };

    this.__bridgeSend({
      type: 'resumeCompose',
      handle: handle,
      messageNamer: serializeMessageName(message)
    });

    return composer;
  },

  _recv_composeBegun: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for compose begun:', msg.handle);
      return true;
    }

    req.composer.senderIdentity = new MailSenderIdentity(this, msg.identity);
    req.composer.subject = msg.subject;
    req.composer.body = msg.body; // rich obj of {text, html}
    req.composer.to = msg.to;
    req.composer.cc = msg.cc;
    req.composer.bcc = msg.bcc;
    req.composer._references = msg.referencesStr;
    req.composer.attachments = msg.attachments;
    req.composer.sendStatus = msg.sendStatus; // For displaying "Send failed".

    if (req.callback) {
      var callback = req.callback;
      req.callback = null;
      callback.call(null, req.composer);
    }
    return true;
  },

  _composeAttach: function(draftHandle, attachmentDef, callback) {
    if (!draftHandle) {
      return;
    }
    var draftReq = this._pendingRequests[draftHandle];
    if (!draftReq) {
      return;
    }
    var callbackHandle = this._nextHandle++;
    this._pendingRequests[callbackHandle] = {
      type: 'attachBlobToDraft',
      callback: callback
    };
    this.__bridgeSend({
      type: 'attachBlobToDraft',
      handle: callbackHandle,
      draftHandle: draftHandle,
      attachmentDef: attachmentDef
    });
  },

  _recv_attachedBlobToDraft: function(msg) {
    var callbackReq = this._pendingRequests[msg.handle];
    var draftReq = this._pendingRequests[msg.draftHandle];
    if (!callbackReq) {
      return true;
    }
    delete this._pendingRequests[msg.handle];

    if (callbackReq.callback && draftReq && draftReq.composer) {
      callbackReq.callback(msg.err, draftReq.composer);
    }
    return true;
  },

  _composeDetach: function(draftHandle, attachmentIndex, callback) {
    if (!draftHandle) {
      return;
    }
    var draftReq = this._pendingRequests[draftHandle];
    if (!draftReq) {
      return;
    }
    var callbackHandle = this._nextHandle++;
    this._pendingRequests[callbackHandle] = {
      type: 'detachAttachmentFromDraft',
      callback: callback
    };
    this.__bridgeSend({
      type: 'detachAttachmentFromDraft',
      handle: callbackHandle,
      draftHandle: draftHandle,
      attachmentIndex: attachmentIndex
    });
  },

  _recv_detachedAttachmentFromDraft: function(msg) {
    var callbackReq = this._pendingRequests[msg.handle];
    var draftReq = this._pendingRequests[msg.draftHandle];
    if (!callbackReq) {
      return true;
    }
    delete this._pendingRequests[msg.handle];

    if (callbackReq.callback && draftReq && draftReq.composer) {
      callbackReq.callback(msg.err, draftReq.composer);
    }
    return true;
  },

  _composeDone: function(handle, command, state, callback) {
    if (!handle)
      return;
    var req = this._pendingRequests[handle];
    if (!req) {
      return;
    }
    req.type = command;
    if (callback)
      req.callback = callback;
    this.__bridgeSend({
      type: 'doneCompose',
      handle: handle,
      command: command,
      state: state,
    });
  },

  _recv_doneCompose: function(msg) {
    var req = this._pendingRequests[msg.handle];
    if (!req) {
      unexpectedBridgeDataError('Bad handle for doneCompose:', msg.handle);
      return true;
    }
    req.active = null;
    // Do not cleanup on saves. Do cleanup on successful send, delete, die.
    if (req.type === 'die' || (!msg.err && (req.type !== 'save')))
      delete this._pendingRequests[msg.handle];
    if (req.callback) {
      req.callback.call(null, {
        sentDate: msg.sentDate,
        messageId: msg.messageId,
        sendStatus: msg.sendStatus
      });
      req.callback = null;
    }
    return true;
  },

  //////////////////////////////////////////////////////////////////////////////
  // mode setting for back end universe. Set interactive
  // if the user has been exposed to the UI and it is a
  // longer lived application, not just a cron sync.
  setInteractive: function() {
    this.__bridgeSend({
      type: 'setInteractive'
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // cron syncing

  /**
   * Receive events about the start and stop of periodic syncing
   */
  _recv_cronSyncStart: function ma__recv_cronSyncStart(msg) {
    if (this.oncronsyncstart)
      this.oncronsyncstart(msg.accountIds);
    return true;
  },

  _recv_cronSyncStop: function ma__recv_cronSyncStop(msg) {
    if (this.oncronsyncstop)
      this.oncronsyncstop(msg.accountsResults);
    return true;
  },

  _recv_backgroundSendStatus: function(msg) {
    if (this.onbackgroundsendstatus) {
      this.onbackgroundsendstatus(msg.data);
    }
    return true;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Localization

  /**
   * Provide a list of localized strings for use in message composition.  This
   * should be a dictionary with the following values, with their expected
   * default values for English provided.  Try to avoid being clever and instead
   * just pick the same strings Thunderbird uses for these for the given locale.
   *
   * - wrote: "{{name}} wrote".  Used for the lead-in to the quoted message.
   * - originalMessage: "Original Message".  Gets put between a bunch of dashes
   *    when forwarding a message inline.
   * - forwardHeaderLabels:
   *   - subject
   *   - date
   *   - from
   *   - replyTo (for the "reply-to" header)
   *   - to
   *   - cc
   */
  useLocalizedStrings: function(strings) {
    this.__bridgeSend({
      type: 'localizedStrings',
      strings: strings
    });
    if (strings.folderNames)
      this.l10n_folder_names = strings.folderNames;
  },

  /**
   * L10n strings for folder names.  These map folder types to appropriate
   * localized strings.
   *
   * We don't remap unknown types, so this doesn't need defaults.
   */
  l10n_folder_names: {},

  l10n_folder_name: function(name, type) {
    if (this.l10n_folder_names.hasOwnProperty(type)) {
      var lowerName = name.toLowerCase();
      // Many of the names are the same as the type, but not all.
      if ((type === lowerName) ||
          (type === 'drafts') ||
          (type === 'junk') ||
          (type === 'queue'))
        return this.l10n_folder_names[type];
    }
    return name;
  },


  //////////////////////////////////////////////////////////////////////////////
  // Configuration

  /**
   * Change one-or-more backend-wide settings; use `MailAccount.modifyAccount`
   * to chang per-account settings.
   */
  modifyConfig: function(mods) {
    for (var key in mods) {
      if (LEGAL_CONFIG_KEYS.indexOf(key) === -1)
        throw new Error(key + ' is not a legal config key!');
    }
    this.__bridgeSend({
      type: 'modifyConfig',
      mods: mods
    });
  },

  _recv_config: function(msg) {
    this.config = msg.config;
    return true;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Diagnostics / Test Hacks

  /**
   * After a setZeroTimeout, send a 'ping' to the bridge which will send a
   * 'pong' back, notifying the provided callback.  This is intended to be hack
   * to provide a way to ensure that some function only runs after all of the
   * notifications have been received and processed by the back-end.
   *
   * Note that ping messages are always processed as they are received; they do
   * not get deferred like other messages.
   */
  ping: function(callback) {
    var handle = this._nextHandle++;
    this._pendingRequests[handle] = {
      type: 'ping',
      callback: callback,
    };

    // With the introduction of slice batching, we now wait to send the ping.
    // This is reasonable because there are conceivable situations where the
    // caller really wants to wait until all related callbacks fire before
    // dispatching.  And the ping method is already a hack to ensure correctness
    // ordering that should be done using better/more specific methods, so this
    // change is not any less of a hack/evil, although it does cause misuse to
    // potentially be more capable of causing intermittent failures.
    window.setZeroTimeout(function() {
      this.__bridgeSend({
        type: 'ping',
        handle: handle,
      });
    }.bind(this));
  },

  _recv_pong: function(msg) {
    var req = this._pendingRequests[msg.handle];
    delete this._pendingRequests[msg.handle];
    req.callback();
    return true;
  },

  debugSupport: function(command, argument) {
    if (command === 'setLogging')
      this.config.debugLogging = argument;
    this.__bridgeSend({
      type: 'debugSupport',
      cmd: command,
      arg: argument
    });
  }

  //////////////////////////////////////////////////////////////////////////////
};

}); // end define
