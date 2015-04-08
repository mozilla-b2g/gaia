define(
  [
    'logic',
    '../date',
    '../syncbase',
    '../allback',
    '../db/mail_rep',
    'activesync/codepages/AirSync',
    'activesync/codepages/AirSyncBase',
    'activesync/codepages/ItemEstimate',
    'activesync/codepages/Email',
    'activesync/codepages/ItemOperations',
    'safe-base64',
    'mimetypes',
    'module',
    'require',
    'exports'
  ],
  function(
    logic,
    $date,
    $sync,
    allback,
    mailRep,
    $AirSync,
    $AirSyncBase,
    $ItemEstimate,
    $Email,
    $ItemOperations,
    safeBase64,
    mimetypes,
    $module,
    require,
    exports
  ) {
'use strict';

/**
 * The desired number of bytes to fetch when downloading bodies, but the body's
 * size exceeds the maximum requested size.
 */
var DESIRED_TEXT_SNIPPET_BYTES = 512;

/**
 * This is minimum number of messages we'd like to get for a folder for a given
 * sync range. It's not exact, since we estimate from the number of messages in
 * the past two weeks, but it's close enough.
 */
var DESIRED_MESSAGE_COUNT = 50;

/**
 * Filter types are lazy initialized once the activesync code is loaded.
 */
var FILTER_TYPE, SYNC_RANGE_TO_FILTER_TYPE, FILTER_TYPE_TO_STRING;
function initFilterTypes() {
  FILTER_TYPE = $AirSync.Enums.FilterType;

  /**
   * Map our built-in sync range values to their corresponding ActiveSync
   * FilterType values. We exclude 3 and 6 months, since they aren't valid for
   * email.
   *
   * Also see SYNC_RANGE_ENUMS_TO_MS in `syncbase.js`.
   */
  SYNC_RANGE_TO_FILTER_TYPE = {
    'auto': null,
      '1d': FILTER_TYPE.OneDayBack,
      '3d': FILTER_TYPE.ThreeDaysBack,
      '1w': FILTER_TYPE.OneWeekBack,
      '2w': FILTER_TYPE.TwoWeeksBack,
      '1m': FILTER_TYPE.OneMonthBack,
     'all': FILTER_TYPE.NoFilter,
  };

  /**
   * This mapping is purely for logging purposes.
   */
  FILTER_TYPE_TO_STRING = {
    0: 'all messages',
    1: 'one day',
    2: 'three days',
    3: 'one week',
    4: 'two weeks',
    5: 'one month',
  };
}

var $wbxml, parseAddresses, $mailchew;

function lazyConnection(cbIndex, fn, failString) {
  return function lazyRun() {
    var args = Array.slice(arguments),
        errback = args[cbIndex],
        self = this;

    require(['wbxml', 'addressparser', '../mailchew'],
    function (wbxml, addressparser, mailchew) {
      if (!$wbxml) {
        $wbxml = wbxml;
        parseAddresses = addressparser.parse.bind(addressparser);
        $mailchew = mailchew;
        initFilterTypes();
      }

      self._account.withConnection(errback, function () {
        fn.apply(self, args);
      }, failString);
    });
  };
}


function ActiveSyncFolderConn(account, storage) {
  this._account = account;
  this._storage = storage;
  logic.defineScope(this, 'ActiveSyncFolderConn',
                    { folderId: storage.folderId,
                      accountId: account.id });

  this.folderMeta = storage.folderMeta;

  if (!this.syncKey)
    this.syncKey = '0';
}
ActiveSyncFolderConn.prototype = {
  get syncKey() {
    return this.folderMeta.syncKey;
  },

  set syncKey(value) {
    return this.folderMeta.syncKey = value;
  },

  get serverId() {
    return this.folderMeta.serverId;
  },

  /**
   * Get the filter type for this folder. The account-level syncRange property
   * takes precedence here, but if it's set to "auto", we'll look at the
   * filterType on a per-folder basis. The per-folder filterType may be
   * undefined, in which case, we will attempt to infer a good filter type
   * elsewhere (see _inferFilterType()).
   * ASSUMES that it is only called after lazy load of activesync code and
   * initFilterTypes() has been run.
   */
  get filterType() {
    var syncRange = this._account.accountDef.syncRange;
    if (SYNC_RANGE_TO_FILTER_TYPE.hasOwnProperty(syncRange)) {
      var accountFilterType = SYNC_RANGE_TO_FILTER_TYPE[syncRange];
      if (accountFilterType)
        return accountFilterType;
      else
        return this.folderMeta.filterType;
    }
    else {
      console.warn('Got an invalid syncRange (' + syncRange +
                   ') using three days back instead');
      return $AirSync.Enums.FilterType.ThreeDaysBack;
    }
  },

  /**
   * Get the initial sync key for the folder so we can start getting data. We
   * assume we have already negotiated a connection in the caller.
   *
   * @param {string} filterType The filter type for our synchronization
   * @param {function} callback A callback to be run when the operation finishes
   */
  _getSyncKey: lazyConnection(1, function asfc__getSyncKey(filterType,
                                                           callback) {
    var folderConn = this;
    var account = this._account;
    var as = $AirSync.Tags;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(as.Sync)
       .stag(as.Collections)
         .stag(as.Collection)

    if (account.conn.currentVersion.lt('12.1'))
          w.tag(as.Class, 'Email');

          w.tag(as.SyncKey, '0')
           .tag(as.CollectionId, this.serverId)
           .stag(as.Options)
             .tag(as.FilterType, filterType)
           .etag()
         .etag()
       .etag()
     .etag();

    account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error(aError);
        account._reportErrorIfNecessary(aError);
        callback('unknown');
        return;
      }

      // Reset the SyncKey, just in case we don't see a sync key in the
      // response.
      folderConn.syncKey = '0';

      var e = new $wbxml.EventParser();
      e.addEventListener([as.Sync, as.Collections, as.Collection, as.SyncKey],
                         function(node) {
        folderConn.syncKey = node.children[0].textContent;
      });

      e.onerror = function() {}; // Ignore errors.
      e.run(aResponse);

      if (folderConn.syncKey === '0') {
        // We should never actually hit this, since it would mean that the
        // server is refusing to give us a sync key. On the off chance that we
        // do hit it, just bail.
        console.error('Unable to get sync key for folder');
        callback('unknown');
      }
      else {
        callback();
      }
    });
  }),

  /**
   * Get an estimate of the number of messages to be synced.  We assume we have
   * already negotiated a connection in the caller.
   *
   * @param {string} filterType The filter type for our estimate
   * @param {function} callback A callback to be run when the operation finishes
   */
  _getItemEstimate: lazyConnection(1, function asfc__getItemEstimate(filterType,
                                                                     callback) {
    var ie = $ItemEstimate.Tags;
    var as = $AirSync.Tags;

    var account = this._account;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(ie.GetItemEstimate)
       .stag(ie.Collections)
         .stag(ie.Collection);

    if (this._account.conn.currentVersion.gte('14.0')) {
          w.tag(as.SyncKey, this.syncKey)
           .tag(ie.CollectionId, this.serverId)
           .stag(as.Options)
             .tag(as.FilterType, filterType)
           .etag();
    }
    else if (this._account.conn.currentVersion.gte('12.0')) {
          w.tag(ie.CollectionId, this.serverId)
           .tag(as.FilterType, filterType)
           .tag(as.SyncKey, this.syncKey);
    }
    else {
          w.tag(ie.Class, 'Email')
           .tag(as.SyncKey, this.syncKey)
           .tag(ie.CollectionId, this.serverId)
           .tag(as.FilterType, filterType);
    }

        w.etag(ie.Collection)
       .etag(ie.Collections)
     .etag(ie.GetItemEstimate);

    account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error(aError);
        account._reportErrorIfNecessary(aError);
        callback('unknown');
        return;
      }

      var e = new $wbxml.EventParser();
      var base = [ie.GetItemEstimate, ie.Response];

      var status, estimate;
      e.addEventListener(base.concat(ie.Status), function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener(base.concat(ie.Collection, ie.Estimate),
                         function(node) {
        estimate = parseInt(node.children[0].textContent, 10);
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing GetItemEstimate response', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status !== $ItemEstimate.Enums.Status.Success) {
        console.error('Error getting item estimate:', status);
        callback('unknown');
      }
      else {
        callback(null, estimate);
      }
    });
  }),

  /**
   * Infer the filter type for this folder to get a sane number of messages.
   *
   * @param {function} callback A callback to be run when the operation
   *  finishes, taking two arguments: an error (if any), and the filter type we
   *  picked
   */
  _inferFilterType: lazyConnection(0, function asfc__inferFilterType(callback) {
    var folderConn = this;
    var Type = $AirSync.Enums.FilterType;

    var getEstimate = function(filterType, onSuccess) {
      folderConn._getSyncKey(filterType, function(error) {
        if (error) {
          callback('unknown');
          return;
        }

        folderConn._getItemEstimate(filterType, function(error, estimate) {
          if (error) {
            // If we couldn't get an estimate, just tell the main callback that
            // we want three days back.
            callback(null, Type.ThreeDaysBack);
            return;
          }

          onSuccess(estimate);
        });
      });
    };

    getEstimate(Type.TwoWeeksBack, function(estimate) {
      var messagesPerDay = estimate / 14; // Two weeks. Twoooo weeeeeeks.
      var filterType;

      if (estimate < 0)
        filterType = Type.ThreeDaysBack;
      else if (messagesPerDay >= DESIRED_MESSAGE_COUNT)
        filterType = Type.OneDayBack;
      else if (messagesPerDay * 3 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.ThreeDaysBack;
      else if (messagesPerDay * 7 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.OneWeekBack;
      else if (messagesPerDay * 14 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.TwoWeeksBack;
      else if (messagesPerDay * 30 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.OneMonthBack;
      else {
        getEstimate(Type.NoFilter, function(estimate) {
          var filterType;
          if (estimate > DESIRED_MESSAGE_COUNT) {
            filterType = Type.OneMonthBack;
            // Reset the sync key since we're changing filter types. This avoids
            // a round-trip where we'd normally get a zero syncKey from the
            // server.
            folderConn.syncKey = '0';
          }
          else {
            filterType = Type.NoFilter;
          }
          logic(folderConn, 'inferFilterType', { filterType: filterType });
          callback(null, filterType);
        });
        return;
      }

      if (filterType !== Type.TwoWeeksBack) {
        // Reset the sync key since we're changing filter types. This avoids a
        // round-trip where we'd normally get a zero syncKey from the server.
        folderConn.syncKey = '0';
      }
      logic(folderConn, 'inferFilterType', { filterType: filterType });
      callback(null, filterType);
    });
  }),

  /**
   * Sync the folder with the server and enumerate all the changes since the
   * last sync.
   *
   * @param {function} callback A function to be called when the operation has
   *   completed, taking three arguments: |added|, |changed|, and |deleted|
   * @param {function} progress A function to be called as the operation
   *   progresses that takes a number in the range [0.0, 1.0] to express
   *   progress.
   */
  _enumerateFolderChanges: lazyConnection(0,
    function asfc__enumerateFolderChanges(callback, progress) {
    var folderConn = this, storage = this._storage;

    if (!this.filterType) {
      this._inferFilterType(function(error, filterType) {
        if (error) {
          callback('unknown');
          return;
        }
        console.log('We want a filter of', FILTER_TYPE_TO_STRING[filterType]);
        folderConn.folderMeta.filterType = filterType;
        folderConn._enumerateFolderChanges(callback, progress);
      });
      return;
    }
    if (this.syncKey === '0') {
      this._getSyncKey(this.filterType, function(error) {
        if (error) {
          callback('aborted');
          return;
        }
        folderConn._enumerateFolderChanges(callback, progress);
      });
      return;
    }

    var as = $AirSync.Tags;
    var asEnum = $AirSync.Enums;
    var asb = $AirSyncBase.Tags;
    var asbEnum = $AirSyncBase.Enums;

    var w;

    // If the last sync was ours and we got an empty response back, we can send
    // an empty request to repeat our request. This saves a little bandwidth.
    if (this._account._syncsInProgress++ === 0 &&
        this._account._lastSyncKey === this.syncKey &&
        this._account._lastSyncFilterType === this.filterType &&
        this._account._lastSyncResponseWasEmpty) {
      w = as.Sync;
    }
    else {
      w = new $wbxml.Writer('1.3', 1, 'UTF-8');
      w.stag(as.Sync)
         .stag(as.Collections)
           .stag(as.Collection);

      if (this._account.conn.currentVersion.lt('12.1'))
            w.tag(as.Class, 'Email');

            w.tag(as.SyncKey, this.syncKey)
             .tag(as.CollectionId, this.serverId)
             .tag(as.GetChanges)
             .stag(as.Options)
               .tag(as.FilterType, this.filterType)

      // Older versions of ActiveSync give us the body by default. Ensure they
      // omit it.
      if (this._account.conn.currentVersion.lte('12.0')) {
              w.tag(as.MIMESupport, asEnum.MIMESupport.Never)
               .tag(as.Truncation, asEnum.MIMETruncation.TruncateAll);
      }

            w.etag()
           .etag()
         .etag()
       .etag();
    }

    this._account.conn.postCommand(w, function(aError, aResponse) {
      var added   = [];
      var changed = [];
      var deleted = [];
      var status;
      var moreAvailable = false;

      folderConn._account._syncsInProgress--;

      if (aError) {
        console.error('Error syncing folder:', aError);
        folderConn._account._reportErrorIfNecessary(aError);
        callback('aborted');
        return;
      }

      folderConn._account._lastSyncKey = folderConn.syncKey;
      folderConn._account._lastSyncFilterType = folderConn.filterType;

      if (!aResponse) {
        console.log('Sync completed with empty response');
        folderConn._account._lastSyncResponseWasEmpty = true;
        callback(null, added, changed, deleted);
        return;
      }

      folderConn._account._lastSyncResponseWasEmpty = false;
      var e = new $wbxml.EventParser();
      var base = [as.Sync, as.Collections, as.Collection];

      e.addEventListener(base.concat(as.SyncKey), function(node) {
        folderConn.syncKey = node.children[0].textContent;
      });

      e.addEventListener(base.concat(as.Status), function(node) {
        status = node.children[0].textContent;
      });

      e.addEventListener(base.concat(as.MoreAvailable), function(node) {
        moreAvailable = true;
      });

      e.addEventListener(base.concat(as.Commands, [[as.Add, as.Change]]),
                         function(node) {
        var id, guid, msg;

        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          switch (child.tag) {
          case as.ServerId:
            guid = child.children[0].textContent;
            break;
          case as.ApplicationData:
            try {
              msg = folderConn._parseMessage(child, node.tag === as.Add,
                                             storage);
            }
            catch (ex) {
              // If we get an error, just log it and skip this message.
              console.error('Failed to parse a message:', ex, '\n', ex.stack);
              return;
            }
            break;
          }
        }

        msg.header.srvid = guid;

        var collection = node.tag === as.Add ? added : changed;
        collection.push(msg);
      });

      e.addEventListener(base.concat(as.Commands, [[as.Delete, as.SoftDelete]]),
                         function(node) {
        var guid;

        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          switch (child.tag) {
          case as.ServerId:
            guid = child.children[0].textContent;
            break;
          }
        }

        deleted.push(guid);
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing Sync response:', ex, '\n', ex.stack);
        callback('unknown');
        return;
      }

      if (status === asEnum.Status.Success) {
        console.log('Sync completed: added ' + added.length + ', changed ' +
                    changed.length + ', deleted ' + deleted.length);
        callback(null, added, changed, deleted, moreAvailable);
        if (moreAvailable)
          folderConn._enumerateFolderChanges(callback, progress);
      }
      else if (status === asEnum.Status.InvalidSyncKey) {
        console.warn('ActiveSync had a bad sync key');
        callback('badkey');
      }
      else {
        console.error('Something went wrong during ActiveSync syncing and we ' +
                      'got a status of ' + status);
        callback('unknown');
      }
    }, null, null,
    function progressData(bytesSoFar, totalBytes) {
      // We get the XHR progress status and convert it into progress in the
      // range [0.10, 0.80].  The remaining 20% is processing the specific
      // messages, but we don't bother to generate notifications since that
      // is done synchronously.
      if (!totalBytes)
        totalBytes = Math.max(1000000, bytesSoFar);
      progress(0.1 + 0.7 * bytesSoFar / totalBytes);
    });
  }, 'aborted'),

  /**
   * Parse the DOM of an individual message to build header and body objects for
   * it.
   * ASSUMES activesync code has already been lazy-loaded.
   *
   * @param {WBXML.Element} node The fully-parsed node describing the message
   * @param {boolean} isAdded True if this is a new message, false if it's a
   *   changed one
   * @return {object} An object containing the header and body for the message
   */
  _parseMessage: function asfc__parseMessage(node, isAdded, storage) {
    var em = $Email.Tags;
    var asb = $AirSyncBase.Tags;
    var asbEnum = $AirSyncBase.Enums;

    var header, body, flagHeader;

    if (isAdded) {
      var newId = storage._issueNewHeaderId();
      // note: these will be passed through mailRep.make* later
      header = {
        id: newId,
        // This will be fixed up afterwards for control flow paranoia.
        srvid: null,
        suid: storage.folderId + '/' + newId,
        // ActiveSync does not/cannot tell us the Message-ID header unless we
        // fetch the entire MIME body
        guid: '',
        author: null,
        to: null,
        cc: null,
        bcc: null,
        replyTo: null,
        date: null,
        flags: [],
        hasAttachments: false,
        subject: null,
        snippet: null
      };

      body = {
        date: null,
        size: 0,
        attachments: [],
        relatedParts: [],
        references: null,
        bodyReps: null
      };

      flagHeader = function(flag, state) {
        if (state)
          header.flags.push(flag);
      }
    }
    else {
      header = {
        flags: [],
        mergeInto: function(o) {
          // Merge flags
          for (var iter in Iterator(this.flags)) {
            var flagstate = iter[1];
            if (flagstate[1]) {
              o.flags.push(flagstate[0]);
            }
            else {
              var index = o.flags.indexOf(flagstate[0]);
              if (index !== -1)
                o.flags.splice(index, 1);
            }
          }

          // Merge everything else
          var skip = ['mergeInto', 'suid', 'srvid', 'guid', 'id', 'flags'];
          for (var iter in Iterator(this)) {
            var key = iter[0], value = iter[1];
            if (skip.indexOf(key) !== -1)
              continue;

            o[key] = value;
          }
        },
      };

      body = {
        mergeInto: function(o) {
          for (var iter in Iterator(this)) {
            var key = iter[0], value = iter[1];
            if (key === 'mergeInto') continue;
            o[key] = value;
          }
        },
      };

      flagHeader = function(flag, state) {
        header.flags.push([flag, state]);
      }
    }

    var bodyType, bodySize;

    for (var iter in Iterator(node.children)) {
      var child = iter[1];
      var childText = child.children.length ? child.children[0].textContent :
                                              null;

      switch (child.tag) {
      case em.Subject:
        header.subject = childText;
        break;
      case em.From:
        header.author = parseAddresses(childText)[0] || null;
        break;
      case em.To:
        header.to = parseAddresses(childText);
        break;
      case em.Cc:
        header.cc = parseAddresses(childText);
        break;
      case em.ReplyTo:
        header.replyTo = parseAddresses(childText);
        break;
      case em.DateReceived:
        body.date = header.date = new Date(childText).valueOf();
        break;
      case em.Read:
        flagHeader('\\Seen', childText === '1');
        break;
      case em.Flag:
        for (var iter2 in Iterator(child.children)) {
          var grandchild = iter2[1];
          if (grandchild.tag === em.Status)
            flagHeader('\\Flagged', grandchild.children[0].textContent !== '0');
        }
        break;
      case asb.Body: // ActiveSync 12.0+
        for (var iter2 in Iterator(child.children)) {
          var grandchild = iter2[1];
          switch (grandchild.tag) {
          case asb.Type:
            var type = grandchild.children[0].textContent;
            if (type === asbEnum.Type.HTML)
              bodyType = 'html';
            else {
              // I've seen a handful of extra-weird messages with body types
              // that aren't plain or html. Let's assume they're plain, though.
              if (type !== asbEnum.Type.PlainText)
                console.warn('A message had a strange body type:', type)
              bodyType = 'plain';
            }
            break;
          case asb.EstimatedDataSize:
            bodySize = grandchild.children[0].textContent;
            break;
          }
        }
        break;
      case em.BodySize: // pre-ActiveSync 12.0
        bodyType = 'plain';
        bodySize = childText;
        break;
      case asb.Attachments: // ActiveSync 12.0+
      case em.Attachments:  // pre-ActiveSync 12.0
        for (var iter2 in Iterator(child.children)) {
          var attachmentNode = iter2[1];
          if (attachmentNode.tag !== asb.Attachment &&
              attachmentNode.tag !== em.Attachment)
            continue;

          var attachment = {
            name: null,
            contentId: null,
            type: null,
            part: null,
            encoding: null,
            sizeEstimate: null,
            file: null,
          };

          var isInline = false;
          for (var iter3 in Iterator(attachmentNode.children)) {
            var attachData = iter3[1];
            var dot, ext;
            var attachDataText = attachData.children.length ?
                                 attachData.children[0].textContent : null;

            switch (attachData.tag) {
            case asb.DisplayName:
            case em.DisplayName:
              attachment.name = attachDataText;

              // Get the file's extension to look up a mimetype, but ignore it
              // if the filename is of the form '.bashrc'.
              dot = attachment.name.lastIndexOf('.');
              ext = dot > 0 ? attachment.name.substring(dot + 1).toLowerCase() :
                              '';
              attachment.type = mimetypes.detectMimeType(ext);
              break;
            case asb.FileReference:
            case em.AttName:
            case em.Att0Id:
              attachment.part = attachDataText;
              break;
            case asb.EstimatedDataSize:
            case em.AttSize:
              attachment.sizeEstimate = parseInt(attachDataText, 10);
              break;
            case asb.ContentId:
              attachment.contentId = attachDataText;
              break;
            case asb.IsInline:
              isInline = (attachDataText === '1');
              break;
            }
          }

          if (isInline)
            body.relatedParts.push(mailRep.makeAttachmentPart(attachment));
          else
            body.attachments.push(mailRep.makeAttachmentPart(attachment));
        }
        header.hasAttachments = body.attachments.length > 0;
        break;
      }
    }

    // If this is an add, then these are new structures so we need to normalize
    // them.
    if (isAdded) {
      body.bodyReps = [mailRep.makeBodyPart({
        type: bodyType,
        sizeEstimate: bodySize,
        amountDownloaded: 0,
        isDownloaded: false
      })];

      return {
        header: mailRep.makeHeaderInfo(header),
        body: mailRep.makeBodyInfo(body)
      };
    }
    // It's not an add, so this is a delta, and header/body have mergeInto
    // methods and we should not attempt to normalize them.
    else {
      return { header: header, body: body };
    }
  },

  /**
   * Download the bodies for a set of headers.
   *
   * XXX This method is a slightly modified version of
   * ImapFolderConn._lazyDownloadBodies; we should attempt to remove the
   * duplication.
   */
  downloadBodies: function(headers, options, callback) {
    if (this._account.conn.currentVersion.lt('12.0'))
      return this._syncBodies(headers, callback);

    var downloadsNeeded = 0,
        folderConn = this;

    var latch = allback.latch();
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      // We obviously can't do anything with null header references.
      // To avoid redundant work, we also don't want to do any fetching if we
      // already have a snippet.  This could happen because of the extreme
      // potential for a caller to spam multiple requests at us before we
      // service any of them.  (Callers should only have one or two outstanding
      // jobs of this and do their own suppression tracking, but bugs happen.)
      if (!header || header.snippet !== null) {
        continue;
      }

      // This isn't absolutely guaranteed to be 100% correct, but is good enough
      // for indicating to the caller that we did some work.
      downloadsNeeded++;
      this.downloadBodyReps(header, options, latch.defer(header.suid));
    }
    latch.then(function(results) {
      callback(allback.extractErrFromCallbackArgs(results), downloadsNeeded);
    });
  },

  downloadBodyReps: lazyConnection(1, function(header, options, callback) {
    var folderConn = this;
    var account = this._account;

    if (account.conn.currentVersion.lt('12.0'))
      return this._syncBodies([header], callback);

    if (typeof(options) === 'function') {
      callback = options;
      options = null;
    }
    options = options || {};

    var io = $ItemOperations.Tags;
    var ioEnum = $ItemOperations.Enums;
    var as = $AirSync.Tags;
    var asEnum = $AirSync.Enums;
    var asb = $AirSyncBase.Tags;
    var Type = $AirSyncBase.Enums.Type;

    var gotBody = function gotBody(bodyInfo) {
      if (!bodyInfo)
        return callback('unknown');

      // ActiveSync only stores one body rep, no matter how many body parts the
      // MIME message actually has.
      var bodyRep = bodyInfo.bodyReps[0];
      var bodyType = bodyRep.type === 'html' ? Type.HTML : Type.PlainText;

      var truncationSize;

      // If the body is bigger than the max size, grab a small bit of plain text
      // to show as the snippet.
      if (options.maximumBytesToFetch < bodyRep.sizeEstimate) {
        bodyType = Type.PlainText;
        truncationSize = DESIRED_TEXT_SNIPPET_BYTES;
      }

      var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
      w.stag(io.ItemOperations)
         .stag(io.Fetch)
           .tag(io.Store, 'Mailbox')
           .tag(as.CollectionId, folderConn.serverId)
           .tag(as.ServerId, header.srvid)
           .stag(io.Options)
             // Only get the AirSyncBase:Body element to minimize bandwidth.
             .stag(io.Schema)
               .tag(asb.Body)
             .etag()
             .stag(asb.BodyPreference)
               .tag(asb.Type, bodyType);

      if (truncationSize)
              w.tag(asb.TruncationSize, truncationSize);

            w.etag()
           .etag()
         .etag()
       .etag();

      account.conn.postCommand(w, function(aError, aResponse) {
        if (aError) {
          console.error(aError);
          account._reportErrorIfNecessary(aError);
          callback('unknown');
          return;
        }

        var status, bodyContent, parseError,
            e = new $wbxml.EventParser();
        e.addEventListener([io.ItemOperations, io.Status], function(node) {
          status = node.children[0].textContent;
        });
        e.addEventListener([io.ItemOperations, io.Response, io.Fetch,
                            io.Properties, asb.Body, asb.Data], function(node) {
          bodyContent = node.children[0].textContent;
        });

        try {
          e.run(aResponse);
        }
        catch (ex) {
          return callback('unknown');
        }

        if (status !== ioEnum.Status.Success)
          return callback('unknown');

        folderConn._updateBody(header, bodyInfo, bodyContent, !!truncationSize,
                               callback);
      });
    };

    this._storage.getMessageBody(header.suid, header.date, gotBody);
  }),

  /**
   * Sync message bodies. This function should only be used against ActiveSync
   * 2.5! XXX: This *always* downloads the bodies for all the messages, even if
   * it exceeds the maximum requested size.
   */
  _syncBodies: function(headers, callback) {
    var as = $AirSync.Tags;
    var asEnum = $AirSync.Enums;
    var em = $Email.Tags;

    var folderConn = this;
    var account = this._account;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(as.Sync)
       .stag(as.Collections)
         .stag(as.Collection)
           .tag(as.Class, 'Email')
           .tag(as.SyncKey, this.syncKey)
           .tag(as.CollectionId, this.serverId)
           .stag(as.Options)
             .tag(as.MIMESupport, asEnum.MIMESupport.Never)
           .etag()
           .stag(as.Commands);

    for (var i = 0; i < headers.length; i++) {
            w.stag(as.Fetch)
               .tag(as.ServerId, headers[i].srvid)
             .etag();
    }

          w.etag()
         .etag()
       .etag()
     .etag();

    account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error(aError);
        account._reportErrorIfNecessary(aError);
        callback('unknown');
        return;
      }

      var latch = allback.latch();
      var iHeader = 0;

      var e = new $wbxml.EventParser();
      var base = [as.Sync, as.Collections, as.Collection];
      e.addEventListener(base.concat(as.SyncKey), function(node) {
        folderConn.syncKey = node.children[0].textContent;
      });
      e.addEventListener(base.concat(as.Status), function(node) {
        var status = node.children[0].textContent;
        if (status !== asEnum.Status.Success) {
          latch.defer('status')('unknown');
        }
      });
      e.addEventListener(base.concat(as.Responses, as.Fetch,
                                     as.ApplicationData, em.Body),
                         function(node) {
        // We assume the response is in the same order as the request!
        var header = headers[iHeader++];
        var bodyContent = node.children[0].textContent;
        var latchCallback = latch.defer(header.suid);

        folderConn._storage.getMessageBody(header.suid, header.date,
                                           function(body) {
          folderConn._updateBody(header, body, bodyContent, false,
                                 latchCallback);
        });
      });
      e.run(aResponse);

      latch.then(function(results) {
        callback(allback.extractErrFromCallbackArgs(results));
      });
    });
  },

  /**
   * Determine whether an activesync header represents a read message.
   * ActiveSync has an different header flag formant: ['flag', true/false].
   */
  _activeSyncHeaderIsSeen: function(header) {
    for (var i = 0; i < header.flags.length; i++) {
      if (header.flags[i][0] === '\\Seen' && header.flags[i][1]) {
        return true;
      }
    }
    return false;
  },

  _updateBody: function(header, bodyInfo, bodyContent, snippetOnly, callback) {
    var bodyRep = bodyInfo.bodyReps[0];

    // We neither need to store or want to deal with \r in the processing of
    // the body.
    bodyContent = bodyContent.replace(/\r/g, '');

    var type = snippetOnly ? 'plain' : bodyRep.type;
    var data = $mailchew.processMessageContent(bodyContent, type, !snippetOnly,
                                               true);

    header.snippet = data.snippet;
    bodyRep.isDownloaded = !snippetOnly;
    bodyRep.amountDownloaded = bodyContent.length;
    if (!snippetOnly)
      bodyRep.content = data.content;

    var event = {
      changeDetails: {
        bodyReps: [0]
      }
    };

    var latch = allback.latch();
    this._storage.updateMessageHeader(header.date, header.id, false, header,
                                      bodyInfo, latch.defer('header'));
    this._storage.updateMessageBody(header, bodyInfo, {}, event,
                                    latch.defer('body'));
    latch.then(callback.bind(null, null, bodyInfo, /* flushed */ false));
  },

  sync: lazyConnection(1, function asfc_sync(accuracyStamp, doneCallback,
                                    progressCallback) {
    var folderConn = this,
        addedMessages = 0,
        changedMessages = 0,
        deletedMessages = 0;

    logic(this, 'sync_begin');
    var self = this;
    this._enumerateFolderChanges(function (error, added, changed, deleted,
                                           moreAvailable) {
      var storage = folderConn._storage;

      if (error === 'badkey') {
        folderConn._account._recreateFolder(storage.folderId, function(s) {
          // If we got a bad sync key, we'll end up creating a new connection,
          // so just clear out the old storage to make this connection unusable.
          folderConn._storage = null;
          logic(folderConn, 'sync_end', {
		    full: null, changed: null, deleted: null
		  });
        });
        return;
      }
      else if (error) {
        // Sync is over!
        logic(folderConn, 'sync_end', {
		  full: null, changed: null, deleted: null
        });
        doneCallback(error);
        return;
      }

      var latch = allback.latch();
      for (var iter in Iterator(added)) {
        var message = iter[1];
        // If we already have this message, it's probably because we moved it as
        // part of a local op, so let's assume that the data we already have is
        // ok. XXX: We might want to verify this, to be safe.
        if (storage.hasMessageWithServerId(message.header.srvid))
          continue;

        storage.addMessageHeader(message.header, message.body, latch.defer());
        storage.addMessageBody(message.header, message.body, latch.defer());
        addedMessages++;
      }

      for (var iter in Iterator(changed)) {
        var message = iter[1];
        // If we don't know about this message, just bail out.
        if (!storage.hasMessageWithServerId(message.header.srvid))
          continue;

        storage.updateMessageHeaderByServerId(message.header.srvid, true,
                                              function(message, oldHeader) {

          if (!self._activeSyncHeaderIsSeen(oldHeader) &&
            self._activeSyncHeaderIsSeen(message.header)) {
            storage.folderMeta.unreadCount--;
          } else if (self._activeSyncHeaderIsSeen(oldHeader) &&
            !self._activeSyncHeaderIsSeen(message.header)) {
            storage.folderMeta.unreadCount++;
          }

          message.header.mergeInto(oldHeader);
          return true;
        // Previously, this callback was called without safeguards in place
        // to prevent issues caused by the message variable changing,
        // so it is now bound to the function.
        }.bind(null, message), /* body hint */ null, latch.defer());
        changedMessages++;
        // XXX: update bodies
      }

      for (var iter in Iterator(deleted)) {
        var messageGuid = iter[1];
        // If we don't know about this message, it's probably because we already
        // deleted it.
        if (!storage.hasMessageWithServerId(messageGuid))
          continue;

        storage.deleteMessageByServerId(messageGuid, latch.defer());
        deletedMessages++;
      }

      if (!moreAvailable) {
        var messagesSeen = addedMessages + changedMessages + deletedMessages;

        // Do not report completion of sync until all of our operations have
        // been persisted to our in-memory database.  We tell this via their
        // callbacks having completed.
        latch.then(function() {
          // Note: For the second argument here, we report the number of
          // messages we saw that *changed*. This differs from IMAP, which
          // reports the number of messages it *saw*.
          logic(folderConn, 'sync_end', {
            full: addedMessages,
            changed: changedMessages,
            deleted: deletedMessages
          });
          storage.markSyncRange($sync.OLDEST_SYNC_DATE, accuracyStamp, 'XXX',
                                accuracyStamp);
          doneCallback(null, null, messagesSeen);
        });
      }
    },
    progressCallback);
  }),

  performMutation: lazyConnection(1, function(invokeWithWriter, callWhenDone) {
    var folderConn = this;

    var as = $AirSync.Tags;
    var account = this._account;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(as.Sync)
       .stag(as.Collections)
         .stag(as.Collection);

    if (account.conn.currentVersion.lt('12.1'))
          w.tag(as.Class, 'Email');

          w.tag(as.SyncKey, this.syncKey)
           .tag(as.CollectionId, this.serverId)
           // Use DeletesAsMoves in non-trash folders. Don't use it in trash
           // folders because that doesn't make any sense.
           .tag(as.DeletesAsMoves, this.folderMeta.type === 'trash' ? '0' : '1')
           // GetChanges defaults to true, so we must explicitly disable it to
           // avoid hearing about changes.
           .tag(as.GetChanges, '0')
           .stag(as.Commands);

    try {
      invokeWithWriter(w);
    }
    catch (ex) {
      console.error('Exception in performMutation callee:', ex,
                    '\n', ex.stack);
      callWhenDone('unknown');
      return;
    }

           w.etag(as.Commands)
         .etag(as.Collection)
       .etag(as.Collections)
     .etag(as.Sync);

    account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error('postCommand error:', aError);
        account._reportErrorIfNecessary(aError);
        callWhenDone('unknown');
        return;
      }

      var e = new $wbxml.EventParser();
      var syncKey, status;

      var base = [as.Sync, as.Collections, as.Collection];
      e.addEventListener(base.concat(as.SyncKey), function(node) {
        syncKey = node.children[0].textContent;
      });
      e.addEventListener(base.concat(as.Status), function(node) {
        status = node.children[0].textContent;
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing Sync response:', ex, '\n', ex.stack);
        callWhenDone('unknown');
        return;
      }

      if (status === $AirSync.Enums.Status.Success) {
        folderConn.syncKey = syncKey;
        if (callWhenDone)
          callWhenDone(null);
      }
      else {
        console.error('Something went wrong during ActiveSync syncing and we ' +
                      'got a status of ' + status);
        callWhenDone('status:' + status);
      }
    });
  }),

  // XXX: take advantage of multipart responses here.
  // See http://msdn.microsoft.com/en-us/library/ee159875%28v=exchg.80%29.aspx
  downloadMessageAttachments: lazyConnection(2, function(uid,
                                                         partInfos,
                                                         callback,
                                                         progress) {
    var folderConn = this;

    var io = $ItemOperations.Tags;
    var ioStatus = $ItemOperations.Enums.Status;
    var asb = $AirSyncBase.Tags;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(io.ItemOperations);
    for (var iter in Iterator(partInfos)) {
      var part = iter[1];
      w.stag(io.Fetch)
         .tag(io.Store, 'Mailbox')
         .tag(asb.FileReference, part.part)
       .etag();
    }
    w.etag();

    this._account.conn.postCommand(w, function(aError, aResult) {
      if (aError) {
        console.error('postCommand error:', aError);
        folderConn._account._reportErrorIfNecessary(aError);
        callback('unknown');
        return;
      }

      var globalStatus;
      var attachments = {};

      var e = new $wbxml.EventParser();
      e.addEventListener([io.ItemOperations, io.Status], function(node) {
        globalStatus = node.children[0].textContent;
      });
      e.addEventListener([io.ItemOperations, io.Response, io.Fetch],
                         function(node) {
        var part = null, attachment = {};

        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          switch (child.tag) {
          case io.Status:
            attachment.status = child.children[0].textContent;
            break;
          case asb.FileReference:
            part = child.children[0].textContent;
            break;
          case io.Properties:
            var contentType = null, data = null;

            for (var iter2 in Iterator(child.children)) {
              var grandchild = iter2[1];
              var textContent = grandchild.children[0].textContent;

              switch (grandchild.tag) {
              case asb.ContentType:
                contentType = textContent;
                break;
              case io.Data:
                data = safeBase64.decode(textContent);
                break;
              }
            }

            if (contentType && data)
              attachment.data = new Blob([data], { type: contentType });
            break;
          }

          if (part)
            attachments[part] = attachment;
        }
      });
      e.run(aResult);

      var error = globalStatus !== ioStatus.Success ? 'unknown' : null;
      var bodies = [];
      for (var iter in Iterator(partInfos)) {
        var part = iter[1];
        if (attachments.hasOwnProperty(part.part) &&
            attachments[part.part].status === ioStatus.Success) {
          bodies.push(attachments[part.part].data);
        }
        else {
          error = 'unknown';
          bodies.push(null);
        }
      }
      callback(error, bodies);
    });
  }),
};

function ActiveSyncFolderSyncer(account, folderStorage) {
  this._account = account;
  this.folderStorage = folderStorage;

  logic.defineScope(this, 'ActiveSyncFolderSyncer',
                    { accountId: account.id,
                      folderId: folderStorage.folderId });

  this.folderConn = new ActiveSyncFolderConn(account, folderStorage);
}
exports.ActiveSyncFolderSyncer = ActiveSyncFolderSyncer;
ActiveSyncFolderSyncer.prototype = {
  /**
   * Can we synchronize?  Not if we don't have a server id!  (This happens for
   * the inbox when it is speculative before our first syncFolderList.)
   */
  get syncable() {
    return this.folderConn.serverId !== null;
  },

  /**
   * Can we grow this sync range?  Not in ActiveSync land!
   */
  get canGrowSync() {
    return false;
  },

  initialSync: function(slice, initialDays, syncCallback,
                        doneCallback, progressCallback) {
    syncCallback('sync', true /* Ignore Headers */);
    this.folderConn.sync(
      $date.NOW(),
      this.onSyncCompleted.bind(this, doneCallback, true),
      progressCallback);
  },

  refreshSync: function(slice, dir, startTS, endTS, origStartTS,
                        doneCallback, progressCallback) {
    this.folderConn.sync(
      $date.NOW(),
      this.onSyncCompleted.bind(this, doneCallback, false),
      progressCallback);
  },

  // Returns false if no sync is necessary.
  growSync: function(slice, growthDirection, anchorTS, syncStepDays,
                     doneCallback, progressCallback) {
    // ActiveSync is different, and trying to sync more doesn't work with it.
    // Just assume we've got all we need.
    // (There is no need to invoke the callbacks; by returning false, we
    // indicate that we did no work.)
    return false;
  },

  /**
   * Whatever synchronization we last triggered has now completed; we should
   * either trigger another sync if we still want more data, or close out the
   * current sync.
   */
  onSyncCompleted: function ifs_onSyncCompleted(doneCallback, initialSync,
                                                err, bisectInfo, messagesSeen) {
    var storage = this.folderStorage;
    console.log("Sync Completed!", messagesSeen, "messages synced");

    // Expand the accuracy range to cover everybody.
    if (!err)
      storage.markSyncedToDawnOfTime();

    // Always save state, although as an optimization, we could avoid saving
    // state if we were sure that our state with the server did not advance.
    // Do not call our callback until the save has completed.
    this._account.__checkpointSyncCompleted(function() {
      if (err) {
        doneCallback(err);
      }
      else if (initialSync) {
        storage._curSyncSlice.ignoreHeaders = false;
        storage._curSyncSlice.waitingOnData = 'db';

        // TODO: We could potentially shave some latency by doing the DB fetch
        // but deferring the doneCallback until the checkpoint has notified.
        // I'm copping out on this right now because there may be some nuances
        // in there that I would like to think about more and this is also not
        // a major slowdown concern.  We're already slow here and the more
        // important thing for us to do would just be to trigger the initial
        // sync much earlier in the UI process to save even more time.
        storage.getMessagesInImapDateRange(
          0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE,
          // Don't trigger a refresh; we just synced.  Accordingly,
          // releaseMutex can be null.
          storage.onFetchDBHeaders.bind(storage, storage._curSyncSlice, false,
                                        doneCallback, null)
        );
      }
      else {
        doneCallback(err);
      }
    });
  },

  allConsumersDead: function() {
  },

  shutdown: function() {
    this.folderConn.shutdown();
  }
};

}); // end define
