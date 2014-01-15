
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/FolderHierarchy',[], factory);
  else
    root.ASCPHierarchy = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Folders:      0x0705,
      Folder:       0x0706,
      DisplayName:  0x0707,
      ServerId:     0x0708,
      ParentId:     0x0709,
      Type:         0x070A,
      Response:     0x070B,
      Status:       0x070C,
      ContentClass: 0x070D,
      Changes:      0x070E,
      Add:          0x070F,
      Delete:       0x0710,
      Update:       0x0711,
      SyncKey:      0x0712,
      FolderCreate: 0x0713,
      FolderDelete: 0x0714,
      FolderUpdate: 0x0715,
      FolderSync:   0x0716,
      Count:        0x0717,
    },
    Enums: {
      Type: {
        Generic:         '1',
        DefaultInbox:    '2',
        DefaultDrafts:   '3',
        DefaultDeleted:  '4',
        DefaultSent:     '5',
        DefaultOutbox:   '6',
        DefaultTasks:    '7',
        DefaultCalendar: '8',
        DefaultContacts: '9',
        DefaultNotes:   '10',
        DefaultJournal: '11',
        Mail:           '12',
        Calendar:       '13',
        Contacts:       '14',
        Tasks:          '15',
        Journal:        '16',
        Notes:          '17',
        Unknown:        '18',
        RecipientCache: '19',
      },
      Status: {
        Success:              '1',
        FolderExists:         '2',
        SystemFolder:         '3',
        FolderNotFound:       '4',
        ParentFolderNotFound: '5',
        ServerError:          '6',
        InvalidSyncKey:       '9',
        MalformedRequest:    '10',
        UnknownError:        '11',
        CodeUnknown:         '12',
      }
    }
  };
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/AirSync',[], factory);
  else
    root.ASCPAirSync = factory();
}(this, function() {
  'use strict';
  return {
    Tags: {
      Sync:              0x0005,
      Responses:         0x0006,
      Add:               0x0007,
      Change:            0x0008,
      Delete:            0x0009,
      Fetch:             0x000A,
      SyncKey:           0x000B,
      ClientId:          0x000C,
      ServerId:          0x000D,
      Status:            0x000E,
      Collection:        0x000F,
      Class:             0x0010,
      Version:           0x0011,
      CollectionId:      0x0012,
      GetChanges:        0x0013,
      MoreAvailable:     0x0014,
      WindowSize:        0x0015,
      Commands:          0x0016,
      Options:           0x0017,
      FilterType:        0x0018,
      Truncation:        0x0019,
      RtfTruncation:     0x001A,
      Conflict:          0x001B,
      Collections:       0x001C,
      ApplicationData:   0x001D,
      DeletesAsMoves:    0x001E,
      NotifyGUID:        0x001F,
      Supported:         0x0020,
      SoftDelete:        0x0021,
      MIMESupport:       0x0022,
      MIMETruncation:    0x0023,
      Wait:              0x0024,
      Limit:             0x0025,
      Partial:           0x0026,
      ConversationMode:  0x0027,
      MaxItems:          0x0028,
      HeartbeatInterval: 0x0029,
    },

    Enums: {
      Status: {
        Success:            '1',
        InvalidSyncKey:     '3',
        ProtocolError:      '4',
        ServerError:        '5',
        ConversionError:    '6',
        MatchingConflict:   '7',
        ObjectNotFound:     '8',
        OutOfSpace:         '9',
        HierarchyChanged:  '12',
        IncompleteRequest: '13',
        InvalidInterval:   '14',
        InvalidRequest:    '15',
        Retry:             '16',
      },
      FilterType: {
        NoFilter:        '0',
        OneDayBack:      '1',
        ThreeDaysBack:   '2',
        OneWeekBack:     '3',
        TwoWeeksBack:    '4',
        OneMonthBack:    '5',
        ThreeMonthsBack: '6',
        SixMonthsBack:   '7',
        IncompleteTasks: '8',
      },
      Conflict: {
        ClientReplacesServer: '0',
        ServerReplacesClient: '1',
      },
      MIMESupport: {
        Never:     '0',
        SMIMEOnly: '1',
        Always:    '2',
      },
      MIMETruncation: {
        TruncateAll:  '0',
        Truncate4K:   '1',
        Truncate5K:   '2',
        Truncate7K:   '3',
        Truncate10K:  '4',
        Truncate20K:  '5',
        Truncate50K:  '6',
        Truncate100K: '7',
        NoTruncate:   '8',
      },
    },
  };
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/AirSyncBase',[], factory);
  else
    root.ASCPAirSyncBase = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      BodyPreference:     0x1105,
      Type:               0x1106,
      TruncationSize:     0x1107,
      AllOrNone:          0x1108,
      Reserved:           0x1109,
      Body:               0x110A,
      Data:               0x110B,
      EstimatedDataSize:  0x110C,
      Truncated:          0x110D,
      Attachments:        0x110E,
      Attachment:         0x110F,
      DisplayName:        0x1110,
      FileReference:      0x1111,
      Method:             0x1112,
      ContentId:          0x1113,
      ContentLocation:    0x1114,
      IsInline:           0x1115,
      NativeBodyType:     0x1116,
      ContentType:        0x1117,
      Preview:            0x1118,
      BodyPartPreference: 0x1119,
      BodyPart:           0x111A,
      Status:             0x111B,
    },
    Enums: {
      Type: {
        PlainText: '1',
        HTML:      '2',
        RTF:       '3',
        MIME:      '4',
      },
      Method: {
        Normal:          '1',
        EmbeddedMessage: '5',
        AttachOLE:       '6',
      },
      NativeBodyType: {
        PlainText: '1',
        HTML:      '2',
        RTF:       '3',
      },
      Status: {
        Success: '1',
      }
    }
  };
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/ItemEstimate',[], factory);
  else
    root.ASCPItemEstimate = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      GetItemEstimate: 0x0605,
      Version:         0x0606,
      Collections:     0x0607,
      Collection:      0x0608,
      Class:           0x0609,
      CollectionId:    0x060A,
      DateTime:        0x060B,
      Estimate:        0x060C,
      Response:        0x060D,
      Status:          0x060E,
    },
    Enums: {
      Status: {
        Success:           '1',
        InvalidCollection: '2',
        NoSyncState:       '3',
        InvalidSyncKey:    '4',
      },
    },
  };
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Email',[], factory);
  else
    root.ASCPEmail = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Attachment:              0x0205,
      Attachments:             0x0206,
      AttName:                 0x0207,
      AttSize:                 0x0208,
      Att0Id:                  0x0209,
      AttMethod:               0x020A,
      AttRemoved:              0x020B,
      Body:                    0x020C,
      BodySize:                0x020D,
      BodyTruncated:           0x020E,
      DateReceived:            0x020F,
      DisplayName:             0x0210,
      DisplayTo:               0x0211,
      Importance:              0x0212,
      MessageClass:            0x0213,
      Subject:                 0x0214,
      Read:                    0x0215,
      To:                      0x0216,
      Cc:                      0x0217,
      From:                    0x0218,
      ReplyTo:                 0x0219,
      AllDayEvent:             0x021A,
      Categories:              0x021B,
      Category:                0x021C,
      DTStamp:                 0x021D,
      EndTime:                 0x021E,
      InstanceType:            0x021F,
      BusyStatus:              0x0220,
      Location:                0x0221,
      MeetingRequest:          0x0222,
      Organizer:               0x0223,
      RecurrenceId:            0x0224,
      Reminder:                0x0225,
      ResponseRequested:       0x0226,
      Recurrences:             0x0227,
      Recurrence:              0x0228,
      Recurrence_Type:         0x0229,
      Recurrence_Until:        0x022A,
      Recurrence_Occurrences:  0x022B,
      Recurrence_Interval:     0x022C,
      Recurrence_DayOfWeek:    0x022D,
      Recurrence_DayOfMonth:   0x022E,
      Recurrence_WeekOfMonth:  0x022F,
      Recurrence_MonthOfYear:  0x0230,
      StartTime:               0x0231,
      Sensitivity:             0x0232,
      TimeZone:                0x0233,
      GlobalObjId:             0x0234,
      ThreadTopic:             0x0235,
      MIMEData:                0x0236,
      MIMETruncated:           0x0237,
      MIMESize:                0x0238,
      InternetCPID:            0x0239,
      Flag:                    0x023A,
      Status:                  0x023B,
      ContentClass:            0x023C,
      FlagType:                0x023D,
      CompleteTime:            0x023E,
      DisallowNewTimeProposal: 0x023F,
    },
    Enums: {
      Importance: {
        Low:    '0',
        Normal: '1',
        High:   '2',
      },
      InstanceType: {
        Single:             '0',
        RecurringMaster:    '1',
        RecurringInstance:  '2',
        RecurringException: '3',
      },
      BusyStatus: {
        Free:      '0',
        Tentative: '1',
        Busy:      '2',
        Oof:       '3',
      },
      Recurrence_Type: {
        Daily:             '0',
        Weekly:             '1',
        MonthlyNthDay:      '2',
        Monthly:            '3',
        YearlyNthDay:       '5',
        YearlyNthDayOfWeek: '6',
      },
      /* XXX: missing Recurrence_DayOfWeek */
      Sensitivity: {
        Normal:       '0',
        Personal:     '1',
        Private:      '2',
        Confidential: '3',
      },
      Status: {
        Cleared:  '0',
        Complete: '1',
        Active:   '2',
      },
    },
  };
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/ItemOperations',[], factory);
  else
    root.ASCPItemOperations = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      ItemOperations:      0x1405,
      Fetch:               0x1406,
      Store:               0x1407,
      Options:             0x1408,
      Range:               0x1409,
      Total:               0x140A,
      Properties:          0x140B,
      Data:                0x140C,
      Status:              0x140D,
      Response:            0x140E,
      Version:             0x140F,
      Schema:              0x1410,
      Part:                0x1411,
      EmptyFolderContents: 0x1412,
      DeleteSubFolders:    0x1413,
      UserName:            0x1414,
      Password:            0x1415,
      Move:                0x1416,
      DstFldId:            0x1417,
      ConversationId:      0x1418,
      MoveAlways:          0x1419,
    },
    Enums: {
      Status: {
        Success:               '1',
        ProtocolError:         '2',
        ServerError:           '3',
        BadURI:                '4',
        AccessDenied:          '5',
        ObjectNotFound:        '6',
        ConnectionFailure:     '7',
        InvalidByteRange:      '8',
        UnknownStore:          '9',
        EmptyFile:            '10',
        DataTooLarge:         '11',
        IOFailure:            '12',
        ConversionFailure:    '14',
        InvalidAttachment:    '15',
        ResourceAccessDenied: '16',
      },
    },
  };
}));

define('mailapi/activesync/folder',
  [
    'rdcommon/log',
    '../date',
    '../syncbase',
    '../util',
    'mailapi/db/mail_rep',
    'activesync/codepages/AirSync',
    'activesync/codepages/AirSyncBase',
    'activesync/codepages/ItemEstimate',
    'activesync/codepages/Email',
    'activesync/codepages/ItemOperations',
    'module',
    'require',
    'exports'
  ],
  function(
    $log,
    $date,
    $sync,
    $util,
    mailRep,
    $AirSync,
    $AirSyncBase,
    $ItemEstimate,
    $Email,
    $ItemOperations,
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

var $wbxml, $mimelib, $mailchew;

function lazyConnection(cbIndex, fn, failString) {
  return function lazyRun() {
    var args = Array.slice(arguments),
        errback = args[cbIndex],
        self = this;

    require(['wbxml', 'mimelib', '../mailchew'],
    function (wbxml, mimelib, mailchew) {
      if (!$wbxml) {
        $wbxml = wbxml;
        $mimelib = mimelib;
        $mailchew = mailchew;
        initFilterTypes();
      }

      self._account.withConnection(errback, function () {
        fn.apply(self, args);
      }, failString);
    });
  };
}


function ActiveSyncFolderConn(account, storage, _parentLog) {
  this._account = account;
  this._storage = storage;
  this._LOG = LOGFAB.ActiveSyncFolderConn(this, _parentLog, storage.folderId);

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
          folderConn._LOG.inferFilterType(filterType);
          callback(null, filterType);
        });
        return;
      }

      if (filterType !== Type.TwoWeeksBack) {
        // Reset the sync key since we're changing filter types. This avoids a
        // round-trip where we'd normally get a zero syncKey from the server.
        folderConn.syncKey = '0';
      }
      folderConn._LOG.inferFilterType(filterType);
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
        header.author = $mimelib.parseAddresses(childText)[0] || null;
        break;
      case em.To:
        header.to = $mimelib.parseAddresses(childText);
        break;
      case em.Cc:
        header.cc = $mimelib.parseAddresses(childText);
        break;
      case em.ReplyTo:
        header.replyTo = $mimelib.parseAddresses(childText);
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
              attachment.type = $mimelib.contentTypes[ext] ||
                                'application/octet-stream';
              break;
            case asb.FileReference:
            case em.AttName:
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
            case asb.FileReference:
            case em.Att0Id:
              attachment.part = attachData.children[0].textContent;
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

    body.bodyReps = [mailRep.makeBodyPart({
      type: bodyType,
      sizeEstimate: bodySize,
      amountDownloaded: 0,
      isDownloaded: false
    })];

    // If this is an add, then these are new structures so we need to normalize
    // them.
    if (isAdded) {
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

    var anyErr,
        pending = 1,
        downloadsNeeded = 0,
        folderConn = this;

    function next(err) {
      if (err && !anyErr)
        anyErr = err;

      if (!--pending) {
        folderConn._storage.runAfterDeferredCalls(function() {
          callback(anyErr, /* number downloaded */ downloadsNeeded - pending);
        });
      }
    }

    for (var i = 0; i < headers.length; i++) {
      // We obviously can't do anything with null header references.
      // To avoid redundant work, we also don't want to do any fetching if we
      // already have a snippet.  This could happen because of the extreme
      // potential for a caller to spam multiple requests at us before we
      // service any of them.  (Callers should only have one or two outstanding
      // jobs of this and do their own suppression tracking, but bugs happen.)
      if (!headers[i] || headers[i].snippet !== null) {
        continue;
      }

      pending++;
      // This isn't absolutely guaranteed to be 100% correct, but is good enough
      // for indicating to the caller that we did some work.
      downloadsNeeded++;
      this.downloadBodyReps(headers[i], options, next);
    }

    // by having one pending item always this handles the case of not having any
    // snippets needing a download and also returning in the next tick of the
    // event loop.
    window.setZeroTimeout(next);
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

        var status, bodyContent,
            e = new $wbxml.EventParser();
        e.addEventListener([io.ItemOperations, io.Status], function(node) {
          status = node.children[0].textContent;
        });
        e.addEventListener([io.ItemOperations, io.Response, io.Fetch,
                            io.Properties, asb.Body, asb.Data], function(node) {
          bodyContent = node.children[0].textContent;
        });
        e.run(aResponse);

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

      var status, anyErr,
          i = 0,
          pending = 1;

      function next(err) {
        if (err && !anyErr)
          anyErr = err;

        if (!--pending) {
          folderConn._storage.runAfterDeferredCalls(function() {
            callback(anyErr);
          });
        }
      }

      var e = new $wbxml.EventParser();
      var base = [as.Sync, as.Collections, as.Collection];
      e.addEventListener(base.concat(as.SyncKey), function(node) {
        folderConn.syncKey = node.children[0].textContent;
      });
      e.addEventListener(base.concat(as.Status), function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener(base.concat(as.Responses, as.Fetch,
                                     as.ApplicationData, em.Body),
                         function(node) {
        // We assume the response is in the same order as the request!
        var header = headers[i++];
        var bodyContent = node.children[0].textContent;

        pending++;
        folderConn._storage.getMessageBody(header.suid, header.date,
                                           function(body) {
          folderConn._updateBody(header, body, bodyContent, false, next);
        });
      });
      e.run(aResponse);

      if (status !== asEnum.Status.Success)
        return next('unknown');

      next(null);
    });
  },

  _updateBody: function(header, bodyInfo, bodyContent, snippetOnly, callback) {
    var bodyRep = bodyInfo.bodyReps[0];

    // XXX We don't want a trailing newline, primarily for unit test reasons
    // right now... This might be a problem on our compose-side for activesync.
    if (bodyContent.length && bodyContent[bodyContent.length - 1] === '\n')
      bodyContent = bodyContent.slice(0, -1);

    // We neither need to store or want to deal with \r in the processing of
    // the body.
    bodyContent = bodyContent.replace(/\r/g, '');

    var type = snippetOnly ? 'plain' : bodyRep.type;
    var data = $mailchew.processMessageContent(bodyContent, type, !snippetOnly,
                                               true, this._LOG);

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

    this._storage.updateMessageHeader(header.date, header.id, false, header);
    this._storage.updateMessageBody(header, bodyInfo, {}, event);
    this._storage.runAfterDeferredCalls(callback.bind(null, null, bodyInfo));
  },

  sync: lazyConnection(1, function asfc_sync(accuracyStamp, doneCallback,
                                    progressCallback) {
    var folderConn = this,
        addedMessages = 0,
        changedMessages = 0,
        deletedMessages = 0;

    this._LOG.sync_begin(null, null, null);
    this._enumerateFolderChanges(function (error, added, changed, deleted,
                                           moreAvailable) {
      var storage = folderConn._storage;

      if (error === 'badkey') {
        folderConn._account._recreateFolder(storage.folderId, function(s) {
          // If we got a bad sync key, we'll end up creating a new connection,
          // so just clear out the old storage to make this connection unusable.
          folderConn._storage = null;
          folderConn._LOG.sync_end(null, null, null);
        });
        return;
      }
      else if (error) {
        // Sync is over!
        folderConn._LOG.sync_end(null, null, null);
        doneCallback(error);
        return;
      }

      for (var iter in Iterator(added)) {
        var message = iter[1];
        // If we already have this message, it's probably because we moved it as
        // part of a local op, so let's assume that the data we already have is
        // ok. XXX: We might want to verify this, to be safe.
        if (storage.hasMessageWithServerId(message.header.srvid))
          continue;

        storage.addMessageHeader(message.header);
        storage.addMessageBody(message.header, message.body);
        addedMessages++;
      }

      for (var iter in Iterator(changed)) {
        var message = iter[1];
        // If we don't know about this message, just bail out.
        if (!storage.hasMessageWithServerId(message.header.srvid))
          continue;

        storage.updateMessageHeaderByServerId(message.header.srvid, true,
                                              function(oldHeader) {
          message.header.mergeInto(oldHeader);
          return true;
        });
        changedMessages++;
        // XXX: update bodies
      }

      for (var iter in Iterator(deleted)) {
        var messageGuid = iter[1];
        // If we don't know about this message, it's probably because we already
        // deleted it.
        if (!storage.hasMessageWithServerId(messageGuid))
          continue;

        storage.deleteMessageByServerId(messageGuid);
        deletedMessages++;
      }

      if (!moreAvailable) {
        var messagesSeen = addedMessages + changedMessages + deletedMessages;

        // Do not report completion of sync until all of our operations have
        // been persisted to our in-memory database.  (We do not wait for
        // things to hit the disk.)
        storage.runAfterDeferredCalls(function() {
          // Note: For the second argument here, we report the number of
          // messages we saw that *changed*. This differs from IMAP, which
          // reports the number of messages it *saw*.
          folderConn._LOG.sync_end(addedMessages, changedMessages,
                                   deletedMessages);
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
                data = new Buffer(textContent, 'base64');
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

function ActiveSyncFolderSyncer(account, folderStorage, _parentLog) {
  this._account = account;
  this.folderStorage = folderStorage;

  this._LOG = LOGFAB.ActiveSyncFolderSyncer(this, _parentLog,
                                            folderStorage.folderId);

  this.folderConn = new ActiveSyncFolderConn(account, folderStorage, this._LOG);
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
    // Always save state, although as an optimization, we could avoid saving state
    // if we were sure that our state with the server did not advance.
    this._account.__checkpointSyncCompleted();

    if (err) {
      doneCallback(err);
      return;
    }

    if (initialSync) {
      storage._curSyncSlice.ignoreHeaders = false;
      storage._curSyncSlice.waitingOnData = 'db';

      storage.getMessagesInImapDateRange(
        0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE,
        // Don't trigger a refresh; we just synced.  Accordingly, releaseMutex can
        // be null.
        storage.onFetchDBHeaders.bind(storage, storage._curSyncSlice, false,
                                      doneCallback, null)
      );
    }
    else {
      doneCallback(err);
    }
  },

  allConsumersDead: function() {
  },

  shutdown: function() {
    this.folderConn.shutdown();
    this._LOG.__die();
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncFolderConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENT,
    events: {
      inferFilterType: { filterType: false },
    },
    asyncJobs: {
      sync: {
        newMessages: true, changedMessages: true, deletedMessages: true,
      },
    },
    errors: {
      htmlParseError: { ex: $log.EXCEPTION },
      htmlSnippetError: { ex: $log.EXCEPTION },
      textChewError: { ex: $log.EXCEPTION },
      textSnippetError: { ex: $log.EXCEPTION },
    },
  },
  ActiveSyncFolderSyncer: {
    type: $log.DATABASE,
    events: {
    }
  },
});

}); // end define
;
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Move',[], factory);
  else
    root.ASCPMove = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      MoveItems: 0x0505,
      Move:      0x0506,
      SrcMsgId:  0x0507,
      SrcFldId:  0x0508,
      DstFldId:  0x0509,
      Response:  0x050A,
      Status:    0x050B,
      DstMsgId:  0x050C,
    },
    Enums: {
      Status: {
        InvalidSourceID: '1',
        InvalidDestID:   '2',
        Success:         '3',
        SourceIsDest:    '4',
        MoveFailure:     '5',
        ItemLocked:      '7',
      },
    },
  };
}));

define('mailapi/activesync/jobs',
  [
    'rdcommon/log',
    'mix',
    '../jobmixins',
    'mailapi/drafts/jobs',
    'activesync/codepages/AirSync',
    'activesync/codepages/Email',
    'activesync/codepages/Move',
    'module',
    'require',
    'exports'
  ],
  function(
    $log,
    mix,
    $jobmixins,
    draftsJobs,
    $AirSync,
    $Email,
    $Move,
    $module,
    require,
    exports
  ) {
'use strict';

var $wbxml;

function lazyConnection(cbIndex, fn, failString) {
  return function lazyRun() {
    var args = Array.slice(arguments),
        errback = args[cbIndex],
        self = this;

    require(['wbxml'], function (wbxml) {
      if (!$wbxml) {
        $wbxml = wbxml;
      }

      self.account.withConnection(errback, function () {
        fn.apply(self, args);
      }, failString);
    });
  };
}

function ActiveSyncJobDriver(account, state, _parentLog) {
  this.account = account;
  // XXX for simplicity for now, let's assume that ActiveSync GUID's are
  // maintained across folder moves.
  this.resilientServerIds = true;
  this._heldMutexReleasers = [];

  this._LOG = LOGFAB.ActiveSyncJobDriver(this, _parentLog, this.account.id);

  this._state = state;
  // (we only need to use one as a proxy for initialization)
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }

  this._stateDelta = {
    serverIdMap: null,
    moveMap: null,
  };
}
exports.ActiveSyncJobDriver = ActiveSyncJobDriver;
ActiveSyncJobDriver.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // helpers

  postJobCleanup: $jobmixins.postJobCleanup,

  allJobsDone: $jobmixins.allJobsDone,

  _accessFolderForMutation: function(folderId, needConn, callback, deathback,
                                     label) {
    var storage = this.account.getFolderStorageForFolderId(folderId),
        self = this;
    storage.runMutexed(label, function(releaseMutex) {
      self._heldMutexReleasers.push(releaseMutex);

      var syncer = storage.folderSyncer;
      if (needConn) {
        self.account.withConnection(callback, function () {
          try {
            callback(syncer.folderConn, storage);
          }
          catch (ex) {
            self._LOG.callbackErr(ex);
          }
        });
      } else {
        try {
          callback(syncer.folderConn, storage);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      }
    });
  },

  _partitionAndAccessFoldersSequentially:
    $jobmixins._partitionAndAccessFoldersSequentially,

  //////////////////////////////////////////////////////////////////////////////
  // modtags

  local_do_modtags: $jobmixins.local_do_modtags,

  do_modtags: lazyConnection(1, function(op, jobDoneCallback, undo) {
    // Note: this method is derived from the IMAP implementation.
    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    function getMark(tag) {
      if (addTags && addTags.indexOf(tag) !== -1)
        return true;
      if (removeTags && removeTags.indexOf(tag) !== -1)
        return false;
      return undefined;
    }

    var markRead = getMark('\\Seen');
    var markFlagged = getMark('\\Flagged');

    var as = $AirSync.Tags;
    var em = $Email.Tags;

    var aggrErr = null;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        var modsToGo = 0;
        function tagsModded(err) {
          if (err) {
            console.error('failure modifying tags', err);
            aggrErr = 'unknown';
            return;
          }
          op.progress += (undo ? -serverIds.length : serverIds.length);
          if (--modsToGo === 0)
            callWhenDone();
        }

        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        folderConn.performMutation(
          function withWriter(w) {
            for (var i = 0; i < serverIds.length; i++) {
              w.stag(as.Change)
                 .tag(as.ServerId, serverIds[i])
                 .stag(as.ApplicationData);

              if (markRead !== undefined)
                w.tag(em.Read, markRead ? '1' : '0');

              if (markFlagged !== undefined)
                w.stag(em.Flag)
                   .tag(em.Status, markFlagged ? '2' : '0')
                 .etag();

                w.etag(as.ApplicationData)
             .etag(as.Change);
            }
          },
          function mutationPerformed(err) {
            if (err)
              aggrErr = err;
            callWhenDone();
          });
      },
      function allDone() {
        jobDoneCallback(aggrErr);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      /* reverse if we're undoing */ undo,
      'modtags');
  }),

  check_modtags: function(op, callback) {
    callback(null, 'idempotent');
  },

  local_undo_modtags: $jobmixins.local_undo_modtags,

  undo_modtags: function(op, callback) {
    this.do_modtags(op, callback, true);
  },

  //////////////////////////////////////////////////////////////////////////////
  // move

  local_do_move: $jobmixins.local_do_move,

  do_move: lazyConnection(1, function(op, jobDoneCallback) {
    /*
     * The ActiveSync command for this does not produce or consume SyncKeys.
     * As such, we don't need to acquire mutexes for the source folders for
     * synchronization correctness, although it is helpful for ordering
     * purposes and reducing confusion.
     *
     * For the target folder a similar logic exists as long as the server-issued
     * GUID's are resilient against folder moves.  However, we do require in
     * all cases that before synchronizing the target folder that we make sure
     * all move operations to the folder have completed so we message doesn't
     * disappear and then show up again. XXX we are not currently enforcing this
     * yet.
     */
    var aggrErr = null, account = this.account,
        targetFolderStorage = this.account.getFolderStorageForFolderId(
                                op.targetFolder);
    var mo = $Move.Tags;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
        w.stag(mo.MoveItems);
        for (var i = 0; i < serverIds.length; i++) {
          w.stag(mo.Move)
             .tag(mo.SrcMsgId, serverIds[i])
             .tag(mo.SrcFldId, storage.folderMeta.serverId)
             .tag(mo.DstFldId, targetFolderStorage.folderMeta.serverId)
           .etag(mo.Move);
        }
        w.etag(mo.MoveItems);

        account.conn.postCommand(w, function(err, response) {
          if (err) {
            aggrErr = err;
            console.error('failure moving messages:', err);
          }
          callWhenDone();
        });
      },
      function allDone() {
        jobDoneCallback(aggrErr, null, true);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      false,
      'move');
  }),

  check_move: function(op, jobDoneCallback) {

  },

  local_undo_move: $jobmixins.local_undo_move,

  undo_move: function(op, jobDoneCallback) {
  },


  //////////////////////////////////////////////////////////////////////////////
  // delete

  local_do_delete: $jobmixins.local_do_delete,

  do_delete: lazyConnection(1, function(op, jobDoneCallback) {
    var aggrErr = null;
    var as = $AirSync.Tags;
    var em = $Email.Tags;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        folderConn.performMutation(
          function withWriter(w) {
            for (var i = 0; i < serverIds.length; i++) {
              w.stag(as.Delete)
                 .tag(as.ServerId, serverIds[i])
               .etag(as.Delete);
            }
          },
          function mutationPerformed(err) {
            if (err) {
              aggrErr = err;
              console.error('failure deleting messages:', err);
            }
            callWhenDone();
          });
      },
      function allDone() {
        jobDoneCallback(aggrErr, null, true);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      false,
      'delete');
  }),

  check_delete: function(op, callback) {
    callback(null, 'idempotent');
  },

  local_undo_delete: $jobmixins.local_undo_delete,

  // TODO implement
  undo_delete: function(op, callback) {
    callback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // syncFolderList
  //
  // Synchronize our folder list.  This should always be an idempotent operation
  // that makes no sense to undo/redo/etc.

  local_do_syncFolderList: function(op, doneCallback) {
    doneCallback(null);
  },

  do_syncFolderList: lazyConnection(1, function(op, doneCallback) {
    var account = this.account, self = this;

    // The inbox needs to be resynchronized if there was no server id and we
    // have active slices displaying the contents of the folder.  (No server id
    // means the sync will not happen.)
    var inboxFolder = account.getFirstFolderWithType('inbox'),
        inboxStorage;
    if (inboxFolder && inboxFolder.serverId === null)
      inboxStorage = account.getFolderStorageForFolderId(inboxFolder.id);
    account.syncFolderList(function(err) {
      if (!err)
        account.meta.lastFolderSyncAt = Date.now();
      // save if it worked
      doneCallback(err ? 'aborted-retry' : null, null, !err);

      if (inboxStorage && inboxStorage.hasActiveSlices) {
        if (!err) {
          console.log("Refreshing fake inbox");
          inboxStorage.resetAndRefreshActiveSlices();
        }
        // XXX: If we do have an error here, we should probably report
        // syncfailed on the slices to let the user retry. However, what needs
        // retrying is syncFolderList, not syncing the messages in a folder.
        // Since that's complicated to handle, and syncFolderList will retry
        // automatically, we can ignore that case for now.
      }
    });
  }, 'aborted-retry'),

  check_syncFolderList: function(op, doneCallback) {
    doneCallback('idempotent');
  },

  local_undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // downloadBodies: Download the bodies from a list of messages

  local_do_downloadBodies: $jobmixins.local_do_downloadBodies,

  do_downloadBodies: $jobmixins.do_downloadBodies,

  check_downloadBodies: $jobmixins.check_downloadBodies,

  //////////////////////////////////////////////////////////////////////////////
  // downloadBodyReps: Download the bodies from a single message

  local_do_downloadBodyReps: $jobmixins.local_do_downloadBodyReps,

  do_downloadBodyReps: $jobmixins.do_downloadBodyReps,

  check_downloadBodyReps: $jobmixins.check_downloadBodyReps,

  //////////////////////////////////////////////////////////////////////////////
  // download: Download one or more attachments from a single message

  local_do_download: $jobmixins.local_do_download,

  do_download: $jobmixins.do_download,

  check_download: $jobmixins.check_download,

  local_undo_download: $jobmixins.local_undo_download,

  undo_download: $jobmixins.undo_download,

  //////////////////////////////////////////////////////////////////////////////
  // purgeExcessMessages is a NOP for activesync

  local_do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  check_purgeExcessMessages: function(op, doneCallback) {
    return 'idempotent';
  },

  local_undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  //////////////////////////////////////////////////////////////////////////////
};

mix(ActiveSyncJobDriver.prototype, draftsJobs.draftsMixins);

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncJobDriver: {
    type: $log.DAEMON,
    events: {
      savedAttachment: { storage: true, mimeType: true, size: true },
      saveFailure: { storage: false, mimeType: false, error: false },
    },
    TEST_ONLY_events: {
      saveFailure: { filename: false },
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },
    },

  },
});

}); // end define
;
/**
 * Implements the ActiveSync protocol for Hotmail and Exchange.
 **/

define('mailapi/activesync/account',
  [
    'rdcommon/log',
    '../a64',
    '../accountmixins',
    '../mailslice',
    '../searchfilter',
    // We potentially create the synthetic inbox while offline, so this can't be
    // lazy-loaded.
    'activesync/codepages/FolderHierarchy',
    './folder',
    './jobs',
    '../util',
    'module',
    'require',
    'exports'
  ],
  function(
    $log,
    $a64,
    $acctmixins,
    $mailslice,
    $searchfilter,
    $FolderHierarchy,
    $asfolder,
    $asjobs,
    $util,
    $module,
    require,
    exports
  ) {
'use strict';

// Lazy loaded vars.
var $wbxml, $asproto, ASCP;

var bsearchForInsert = $util.bsearchForInsert;

var DEFAULT_TIMEOUT_MS = exports.DEFAULT_TIMEOUT_MS = 30 * 1000;

/**
 * Prototype-helper to wrap a method in a call to withConnection.  This exists
 * largely for historical reasons.  All actual lazy-loading happens within
 * withConnection.
 */
function lazyConnection(cbIndex, fn, failString) {
  return function lazyRun() {
    var args = Array.slice(arguments),
        errback = args[cbIndex],
        self = this;

    this.withConnection(errback, function () {
      fn.apply(self, args);
    }, failString);
  };
}

function ActiveSyncAccount(universe, accountDef, folderInfos, dbConn,
                           receiveProtoConn, _parentLog) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  this._db = dbConn;

  this._LOG = LOGFAB.ActiveSyncAccount(this, _parentLog, this.id);

  if (receiveProtoConn) {
    this.conn = receiveProtoConn;
    this._attachLoggerToConnection(this.conn);
  }
  else {
    this.conn = null;
  }

  this.enabled = true;
  this.problems = [];
  this._alive = true;

  this.identities = accountDef.identities;

  this.folders = [];
  this._folderStorages = {};
  this._folderInfos = folderInfos;
  this._serverIdToFolderId = {};
  this._deadFolderIds = null;

  this._syncsInProgress = 0;
  this._lastSyncKey = null;
  this._lastSyncResponseWasEmpty = false;

  this.meta = folderInfos.$meta;
  this.mutations = folderInfos.$mutations;

  // ActiveSync has no need of a timezone offset, but it simplifies things for
  // FolderStorage to be able to rely on this.
  this.tzOffset = 0;

  // Sync existing folders
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer, this._LOG);
    this._serverIdToFolderId[folderInfo.$meta.serverId] = folderId;
    this.folders.push(folderInfo.$meta);
  }

  this.folders.sort(function(a, b) { return a.path.localeCompare(b.path); });

  this._jobDriver = new $asjobs.ActiveSyncJobDriver(
                          this,
                          this._folderInfos.$mutationState);

  // Ensure we have an inbox.  The server id cannot be magically known, so we
  // create it with a null id.  When we actually sync the folder list, the
  // server id will be updated.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    // XXX localized Inbox string (bug 805834)
    this._addedFolder(null, '0', 'Inbox',
                      $FolderHierarchy.Enums.Type.DefaultInbox, null, true);
  }
}
exports.Account = exports.ActiveSyncAccount = ActiveSyncAccount;
ActiveSyncAccount.prototype = {
  type: 'activesync',
  supportsServerFolders: true,
  toString: function asa_toString() {
    return '[ActiveSyncAccount: ' + this.id + ']';
  },

  /**
   * Manages connecting, and wiring up initial connection if it is not
   * initialized yet.
   */
  withConnection: function (errback, callback, failString) {
    // lazy load our dependencies if they haven't already been fetched.  This
    // occurs regardless of whether we have a connection already or not.  We
    // do this because the connection may have been passed-in to us as a
    // leftover of the account creation process.
    if (!$wbxml) {
      require(['wbxml', 'activesync/protocol', 'activesync/codepages'],
              function (_wbxml, _asproto, _ASCP) {
        $wbxml = _wbxml;
        $asproto = _asproto;
        ASCP = _ASCP;

        this.withConnection(errback, callback, failString);
      }.bind(this));
      return;
    }

    if (!this.conn) {
      var accountDef = this.accountDef;
      this.conn = new $asproto.Connection();
      this._attachLoggerToConnection(this.conn);
      this.conn.open(accountDef.connInfo.server,
                     accountDef.credentials.username,
                     accountDef.credentials.password);
      this.conn.timeout = DEFAULT_TIMEOUT_MS;
    }

    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          this._reportErrorIfNecessary(error);
          errback(failString || 'unknown');
          return;
        }
        callback();
      }.bind(this));
    } else {
      callback();
    }
  },

  /**
   * Reports the error to the user if necessary.
   */
  _reportErrorIfNecessary: function(error) {
    if (!error) {
      return;
    }

    if (error instanceof $asproto.HttpError && error.status === 401) {
      // prompt the user to try a different password
      this.universe.__reportAccountProblem(this, 'bad-user-or-pass');
    }
  },


  _attachLoggerToConnection: function(conn) {
    // Use a somewhat unique-ish value for the id so that if we re-create the
    // connection it's obvious it's different from the previous connection.
    var logger = LOGFAB.ActiveSyncConnection(conn, this._LOG,
                                             Date.now() % 1000);
    if (logger.logLevel === 'safe') {
      conn.onmessage = this._onmessage_safe.bind(this, logger);
    }
    else if (logger.logLevel === 'dangerous') {
      conn.onmessage = this._onmessage_dangerous.bind(this, logger);
    }
  },

  /**
   * Basic onmessage ActiveSync protocol logging function.  This does not
   * include user data and is intended for safe circular logging purposes.
   */
  _onmessage_safe: function onmessage(logger,
      type, special, xhr, params, extraHeaders, sentData, response) {
    if (type === 'options') {
      logger.options(special, xhr.status, response);
    }
    else {
      logger.command(type, special, xhr.status);
    }
  },

  /**
   * Dangerous onmessage ActiveSync protocol logging function.  This is
   * intended to log user data for unit testing purposes or very specialized
   * debugging only.
   */
  _onmessage_dangerous: function onmessage(logger,
      type, special, xhr, params, extraHeaders, sentData, response) {
    if (type === 'options') {
      logger.options(special, xhr.status, response);
    }
    else {
      var sentXML, receivedXML;
      if (sentData) {
        try {
          var sentReader = new $wbxml.Reader(new Uint8Array(sentData), ASCP);
          sentXML = sentReader.dump();
        }
        catch (ex) {
          sentXML = 'parse problem';
        }
      }
      if (response) {
        try {
          receivedXML = response.dump();
          response.rewind();
        }
        catch (ex) {
          receivedXML = 'parse problem';
        }
      }
      logger.command(type, special, xhr.status, params, extraHeaders, sentXML,
                     receivedXML);
    }
  },

  toBridgeWire: function asa_toBridgeWire() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: this.accountDef.type,

      defaultPriority: this.accountDef.defaultPriority,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,
      syncInterval: this.accountDef.syncInterval,
      notifyOnNew: this.accountDef.notifyOnNew,

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

  toBridgeFolder: function asa_toBridgeFolder() {
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

  /**
   * Check that the account is healthy in that we can login at all.
   */
  checkAccount: function(callback) {
    // disconnect first so as to properly check credentials
    if (this.conn != null) {
      if (this.conn.connected) {
        this.conn.disconnect();
      }
      this.conn = null;
    }
    this.withConnection(function(err) {
      callback(err);
    }, function() {
      callback();
    });
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function() {
    this.saveAccountState(null, null, 'checkpointSync');
  },

  shutdown: function asa_shutdown(callback) {
    this._LOG.__die();
    if (callback)
      callback();
  },

  accountDeleted: function asa_accountDeleted() {
    this._alive = false;
    this.shutdown();
  },

  sliceFolderMessages: function asa_sliceFolderMessages(folderId,
                                                        bridgeHandle) {
    var storage = this._folderStorages[folderId],
        slice = new $mailslice.MailSlice(bridgeHandle, storage, this._LOG);

    storage.sliceOpenMostRecent(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch, this._LOG);
    // the slice is self-starting, we don't need to call anything on storage
  },

  syncFolderList: lazyConnection(0, function asa_syncFolderList(callback) {
    var account = this;

    var fh = ASCP.FolderHierarchy.Tags;
    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderSync)
       .tag(fh.SyncKey, this.meta.syncKey)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        account._reportErrorIfNecessary(aError);
        callback(aError);
        return;
      }
      var e = new $wbxml.EventParser();
      var deferredAddedFolders = [];

      e.addEventListener([fh.FolderSync, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      e.addEventListener([fh.FolderSync, fh.Changes, [fh.Add, fh.Delete]],
                         function(node) {
        var folder = {};
        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          folder[child.localTagName] = child.children[0].textContent;
        }

        if (node.tag === fh.Add) {
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            deferredAddedFolders.push(folder);
        }
        else {
          account._deletedFolder(folder.ServerId);
        }
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderSync response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      // It's possible we got some folders in an inconvenient order (i.e. child
      // folders before their parents). Keep trying to add folders until we're
      // done.
      while (deferredAddedFolders.length) {
        var moreDeferredAddedFolders = [];
        for (var iter in Iterator(deferredAddedFolders)) {
          var folder = iter[1];
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            moreDeferredAddedFolders.push(folder);
        }
        if (moreDeferredAddedFolders.length === deferredAddedFolders.length)
          throw new Error('got some orphaned folders');
        deferredAddedFolders = moreDeferredAddedFolders;
      }

      // - create local drafts folder (if needed)
      var localDrafts = account.getFirstFolderWithType('localdrafts');
      if (!localDrafts) {
        // Try and add the folder next to the existing drafts folder, or the
        // sent folder if there is no drafts folder.  Otherwise we must have an
        // inbox and we want to live under that.
        var sibling = account.getFirstFolderWithType('drafts') ||
                      account.getFirstFolderWithType('sent');
        // If we have a sibling, it can tell us our gelam parent folder id
        // which is different from our parent server id.  From there, we can
        // map to the serverId.  Note that top-level folders will not have a
        // parentId, in which case we want to just go with the top level.
        var parentServerId;
        if (sibling) {
          if (sibling.parentId)
            parentServerId =
              account._folderInfos[sibling.parentId].$meta.serverId;
          else
            parentServerId = '0';
        }
        // Otherwise try and make the Inbox our parent.
        else {
          parentServerId = account.getFirstFolderWithType('inbox').serverId;
        }
        // Since this is a synthetic folder; we just directly choose the name
        // that our l10n mapping will transform.
        account._addedFolder(null, parentServerId, 'localdrafts', null,
                             'localdrafts');
      }

      console.log('Synced folder list');
      if (callback)
        callback(null);
    });
  }),

  // Map folder type numbers from ActiveSync to Gaia's types
  _folderTypes: {
     1: 'normal', // Generic
     2: 'inbox',  // DefaultInbox
     3: 'drafts', // DefaultDrafts
     4: 'trash',  // DefaultDeleted
     5: 'sent',   // DefaultSent
     6: 'normal', // DefaultOutbox
    12: 'normal', // Mail
  },

  /**
   * Update the internal database and notify the appropriate listeners when we
   * discover a new folder.
   *
   * @param {string} serverId A GUID representing the new folder
   * @param {string} parentServerId A GUID representing the parent folder, or
   *  '0' if this is a root-level folder
   * @param {string} displayName The display name for the new folder
   * @param {string} typeNum A numeric value representing the new folder's type,
   *   corresponding to the mapping in _folderTypes above
   * @param {string} forceType Force a string folder type for this folder.
   *   Used for synthetic folders like localdrafts.
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   * @return {object} the folderMeta if we added the folder, true if we don't
   *   care about this kind of folder, or null if we need to wait until later
   *   (e.g. if we haven't added the folder's parent yet)
   */
  _addedFolder: function asa__addedFolder(serverId, parentServerId, displayName,
                                          typeNum, forceType,
                                          suppressNotification) {
    if (!forceType && !(typeNum in this._folderTypes))
      return true; // Not a folder type we care about.

    var folderType = $FolderHierarchy.Enums.Type;

    var path = displayName;
    var parentFolderId = null;
    var depth = 0;
    if (parentServerId !== '0') {
      parentFolderId = this._serverIdToFolderId[parentServerId];
      // We haven't learned about the parent folder. Just return, and wait until
      // we do.
      if (parentFolderId === undefined)
        return null;
      var parent = this._folderInfos[parentFolderId];
      path = parent.$meta.path + '/' + path;
      depth = parent.$meta.depth + 1;
    }

    // Handle sentinel Inbox.
    if (typeNum === folderType.DefaultInbox) {
      var existingInboxMeta = this.getFirstFolderWithType('inbox');
      if (existingInboxMeta) {
        // Update the server ID to folder ID mapping.
        delete this._serverIdToFolderId[existingInboxMeta.serverId];
        this._serverIdToFolderId[serverId] = existingInboxMeta.id;

        // Update everything about the folder meta.
        existingInboxMeta.serverId = serverId;
        existingInboxMeta.name = displayName;
        existingInboxMeta.path = path;
        existingInboxMeta.depth = depth;
        return existingInboxMeta;
      }
    }

    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: {
        id: folderId,
        serverId: serverId,
        name: displayName,
        type: forceType || this._folderTypes[typeNum],
        path: path,
        parentId: parentFolderId,
        depth: depth,
        lastSyncedAt: 0,
        syncKey: '0',
      },
      // any changes to the structure here must be reflected in _recreateFolder!
      $impl: {
        nextId: 0,
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
      serverIdHeaderBlockMapping: {},
    };

    console.log('Added folder ' + displayName + ' (' + folderId + ')');
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer, this._LOG);
    this._serverIdToFolderId[serverId] = folderId;

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, function(a, b) {
      return a.path.localeCompare(b.path);
    });
    this.folders.splice(idx, 0, folderMeta);

    if (!suppressNotification)
      this.universe.__notifyAddedFolder(this, folderMeta);

    return folderMeta;
  },

  /**
   * Update the internal database and notify the appropriate listeners when we
   * find out a folder has been removed.
   *
   * @param {string} serverId A GUID representing the deleted folder
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   */
  _deletedFolder: function asa__deletedFolder(serverId, suppressNotification) {
    var folderId = this._serverIdToFolderId[serverId],
        folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;

    console.log('Deleted folder ' + folderMeta.name + ' (' + folderId + ')');
    delete this._serverIdToFolderId[serverId];
    delete this._folderInfos[folderId];
    delete this._folderStorages[folderId];

    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    if (!suppressNotification)
      this.universe.__notifyRemovedFolder(this, folderMeta);
  },

  /**
   * Recreate the folder storage for a particular folder; useful when we end up
   * desyncing with the server and need to start fresh.  No notification is
   * generated, although slices are repopulated.
   *
   * FYI: There is a nearly identical method in IMAP's account implementation.
   *
   * @param {string} folderId the local ID of the folder
   * @param {function} callback a function to be called when the operation is
   *   complete, taking the new folder storage
   */
  _recreateFolder: function asa__recreateFolder(folderId, callback) {
    this._LOG.recreateFolder(folderId);
    var folderInfo = this._folderInfos[folderId];
    folderInfo.$impl = {
      nextId: 0,
      nextHeaderBlock: 0,
      nextBodyBlock: 0,
    };
    folderInfo.accuracy = [];
    folderInfo.headerBlocks = [];
    folderInfo.bodyBlocks = [];
    folderInfo.serverIdHeaderBlockMapping = {};

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    var self = this;
    this.saveAccountState(null, function() {
      var newStorage =
        new $mailslice.FolderStorage(self, folderId, folderInfo, self._db,
                                     $asfolder.ActiveSyncFolderSyncer,
                                     self._LOG);
      for (var iter in Iterator(self._folderStorages[folderId]._slices)) {
        var slice = iter[1];
        slice._storage = newStorage;
        slice.reset();
        newStorage.sliceOpenMostRecent(slice);
      }
      self._folderStorages[folderId]._slices = [];
      self._folderStorages[folderId] = newStorage;

      callback(newStorage);
    }, 'recreateFolder');
  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder.
   *
   * @args[
   *   @param[parentFolderId String]
   *   @param[folderName]
   *   @param[containOnlyOtherFolders Boolean]{
   *     Should this folder only contain other folders (and no messages)?
   *     On some servers/backends, mail-bearing folders may not be able to
   *     create sub-folders, in which case one would have to pass this.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, the folder got created and everything is awesome.
   *         }
   *         @case['offline']{
   *           We are offline and can't create the folder.
   *         }
   *         @case['already-exists']{
   *           The folder appears to already exist.
   *         }
   *         @case['unknown']{
   *           It didn't work and we don't have a better reason.
   *         }
   *       ]]
   *       @param[folderMeta ImapFolderMeta]{
   *         The meta-information for the folder.
   *       }
   *     ]
   *   ]]{
   *   }
   * ]
   */
  createFolder: lazyConnection(3, function asa_createFolder(parentFolderId,
                                                      folderName,
                                                      containOnlyOtherFolders,
                                                      callback) {
    var account = this;

    var parentFolderServerId = parentFolderId ?
      this._folderInfos[parentFolderId] : '0';

    var fh = ASCP.FolderHierarchy.Tags;
    var fhStatus = ASCP.FolderHierarchy.Enums.Status;
    var folderType = ASCP.FolderHierarchy.Enums.Type.Mail;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderCreate)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ParentId, parentFolderServerId)
       .tag(fh.DisplayName, folderName)
       .tag(fh.Type, folderType)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      account._reportErrorIfNecessary(aError);

      var e = new $wbxml.EventParser();
      var status, serverId;

      e.addEventListener([fh.FolderCreate, fh.Status], function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderCreate, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderCreate, fh.ServerId], function(node) {
        serverId = node.children[0].textContent;
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderCreate response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status === fhStatus.Success) {
        var folderMeta = account._addedFolder(serverId, parentFolderServerId,
                                              folderName, folderType);
        callback(null, folderMeta);
      }
      else if (status === fhStatus.FolderExists) {
        callback('already-exists');
      }
      else {
        callback('unknown');
      }
    });
  }),

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: lazyConnection(1, function asa_deleteFolder(folderId,
                                                            callback) {
    var account = this;

    var folderMeta = this._folderInfos[folderId].$meta;

    var fh = ASCP.FolderHierarchy.Tags;
    var fhStatus = ASCP.FolderHierarchy.Enums.Status;
    var folderType = ASCP.FolderHierarchy.Enums.Type.Mail;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderDelete)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ServerId, folderMeta.serverId)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      account._reportErrorIfNecessary(aError);

      var e = new $wbxml.EventParser();
      var status;

      e.addEventListener([fh.FolderDelete, fh.Status], function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderDelete, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      try {

        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderDelete response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status === fhStatus.Success) {
        account._deletedFolder(folderMeta.serverId);
        callback(null, folderMeta);
      }
      else {
        callback('unknown');
      }
    });
  }),

  sendMessage: lazyConnection(1, function asa_sendMessage(composer, callback) {
    var account = this;

    // we want the bcc included because that's how we tell the server the bcc
    // results.
    composer.withMessageBlob({ includeBcc: true }, function(mimeBlob) {
      // ActiveSync 14.0 has a completely different API for sending email. Make
      // sure we format things the right way.
      if (this.conn.currentVersion.gte('14.0')) {
        var cm = ASCP.ComposeMail.Tags;
        var w = new $wbxml.Writer('1.3', 1, 'UTF-8', null, 'blob');
        w.stag(cm.SendMail)
           // The ClientId is defined to be for duplicate messages suppression
           // and does not need to have any uniqueness constraints apart from
           // not being similar to (recently sent) messages by this client.
           .tag(cm.ClientId, Date.now().toString()+'@mozgaia')
           .tag(cm.SaveInSentItems)
           .stag(cm.Mime)
             .opaque(mimeBlob)
           .etag()
         .etag();

        this.conn.postCommand(w, function(aError, aResponse) {
          if (aError) {
            account._reportErrorIfNecessary(aError);
            console.error(aError);
            callback('unknown');
            return;
          }

          if (aResponse === null) {
            console.log('Sent message successfully!');
            callback(null);
          }
          else {
            console.error('Error sending message. XML dump follows:\n' +
                          aResponse.dump());
            callback('unknown');
          }
        });
      }
      else { // ActiveSync 12.x and lower
        this.conn.postData('SendMail', 'message/rfc822', mimeBlob,
                           function(aError, aResponse) {
          if (aError) {
            account._reportErrorIfNecessary(aError);
            console.error(aError);
            callback('unknown');
            return;
          }

          console.log('Sent message successfully!');
          callback(null);
        }, { SaveInSent: 'T' });
      }
    }.bind(this));
  }),

  getFolderStorageForFolderId: function asa_getFolderStorageForFolderId(
                               folderId) {
    return this._folderStorages[folderId];
  },

  getFolderStorageForServerId: function asa_getFolderStorageForServerId(
                               serverId) {
    return this._folderStorages[this._serverIdToFolderId[serverId]];
  },

  getFolderMetaForFolderId: function(folderId) {
    if (this._folderInfos.hasOwnProperty(folderId))
      return this._folderInfos[folderId].$meta;
    return null;
  },

  ensureEssentialFolders: function(callback) {
    // XXX I am assuming ActiveSync servers are smart enough to already come
    // with these folders.  If not, we should move IMAP's ensureEssentialFolders
    // into the mixins class.
    if (callback)
      callback();
  },

  scheduleMessagePurge: function(folderId, callback) {
    // ActiveSync servers have no incremental folder growth, so message purging
    // makes no sense for them.
    if (callback)
      callback();
  },

  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
  getFolderByPath: $acctmixins.getFolderByPath,
  saveAccountState: $acctmixins.saveAccountState,
  runAfterSaves: $acctmixins.runAfterSaves
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncAccount: {
    type: $log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},
      recreateFolder: { id: false },
      saveAccountState: { reason: false },
      /**
       * XXX: this is really an error/warning, but to make the logging less
       * confusing, treat it as an event.
       */
      accountDeleted: { where: false },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
    },
    errors: {
      opError: { mode: false, type: false, ex: $log.EXCEPTION },
    }
  },

  ActiveSyncConnection: {
    type: $log.CONNECTION,
    events: {
      options: { special: false, status: false, result: false },
      command: { name: false, special: false, status: false },
    },
    TEST_ONLY_events: {
      options: {},
      command: { params: false, extraHeaders: false, sent: false,
                 response: false },
    },
  },
});

}); // end define
;
/**
 * Configurator for activesync
 **/

define('mailapi/activesync/configurator',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    './account',
    '../date',
    'require',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $asacct,
    $date,
    require,
    exports
  ) {

function checkServerCertificate(url, callback) {
  var match = /^https:\/\/([^:/]+)(?::(\d+))?/.exec(url);
  // probably unit test http case?
  if (!match) {
    callback(null);
    return;
  }
  var port = match[2] ? parseInt(match[2], 10) : 443,
      host = match[1];

  console.log('checking', host, port, 'for security problem');

  require(['tls'], function($tls) {
    var sock = $tls.connect(port, host);
    function reportAndClose(err) {
      if (sock) {
        var wasSock = sock;
        sock = null;
        try {
          wasSock.end();
        }
        catch (ex) {
        }
        callback(err);
      }
    }
    // this is a little dumb, but since we don't actually get an event right now
    // that tells us when our secure connection is established, and connect always
    // happens, we write data when we connect to help trigger an error or have us
    // receive data to indicate we successfully connected.
    // so, the deal is that connect is going to happen.
    sock.on('connect', function() {
      sock.write(new Buffer('GET /images/logo.png HTTP/1.1\n\n'));
    });
    sock.on('error', function(err) {
      var reportErr = null;
      if (err && typeof(err) === 'object' &&
          /^Security/.test(err.name))
        reportErr = 'bad-security';
      reportAndClose(reportErr);
    });
    sock.on('data', function(data) {
      reportAndClose(null);
    });
  });
}

exports.account = $asacct;
exports.configurator = {
  tryToCreateAccount: function cfg_as_ttca(universe, userDetails, domainInfo,
                                           callback, _LOG) {
    require(['activesync/protocol'], function ($asproto) {
      var credentials = {
        username: domainInfo.incoming.username,
        password: userDetails.password,
      };

      var self = this;
      var conn = new $asproto.Connection();
      conn.open(domainInfo.incoming.server, credentials.username,
                credentials.password);
      conn.timeout = $asacct.DEFAULT_TIMEOUT_MS;

      conn.connect(function(error, options) {
        if (error) {
          // This error is basically an indication of whether we were able to
          // call getOptions or not.  If the XHR request completed, we get an
          // HttpError.  If we timed out or an XHR error occurred, we get a
          // general Error.
          var failureType,
              failureDetails = { server: domainInfo.incoming.server };

          if (error instanceof $asproto.HttpError) {
            if (error.status === 401) {
              failureType = 'bad-user-or-pass';
            }
            else if (error.status === 403) {
              failureType = 'not-authorized';
            }
            // Treat any other errors where we talked to the server as a problem
            // with the server.
            else {
              failureType = 'server-problem';
              failureDetails.status = error.status;
            }
          }
          else {
            // We didn't talk to the server, so it's either an unresponsive
            // server or a server with a bad certificate.  (We require https
            // outside of unit tests so there's no need to branch here.)
            checkServerCertificate(
              domainInfo.incoming.server,
              function(securityError) {
                var failureType;
                if (securityError)
                  failureType = 'bad-security';
                else
                  failureType = 'unresponsive-server';
                callback(failureType, null, failureDetails);
              });
            return;
          }
          callback(failureType, null, failureDetails);
          return;
        }

        var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
        var accountDef = {
          id: accountId,
          name: userDetails.accountName || userDetails.emailAddress,
          defaultPriority: $date.NOW(),

          type: 'activesync',
          syncRange: 'auto',

          syncInterval: userDetails.syncInterval || 0,
          notifyOnNew: userDetails.hasOwnProperty('notifyOnNew') ?
                       userDetails.notifyOnNew : true,

          credentials: credentials,
          connInfo: {
            server: domainInfo.incoming.server
          },

          identities: [
            {
              id: accountId + '/' +
                  $a64.encodeInt(universe.config.nextIdentityNum++),
              name: userDetails.displayName || domainInfo.displayName,
              address: userDetails.emailAddress,
              replyTo: null,
              signature: null
            },
          ]
        };

        self._loadAccount(universe, accountDef, conn, function (account) {
          callback(null, account, null);
        });
      });
    }.bind(this));
  },

  recreateAccount: function cfg_as_ra(universe, oldVersion, oldAccountInfo,
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

      type: 'activesync',
      syncRange: oldAccountDef.syncRange,
      syncInterval: oldAccountDef.syncInterval || 0,
      notifyOnNew: oldAccountDef.hasOwnProperty('notifyOnNew') ?
                   oldAccountDef.notifyOnNew : true,

      credentials: credentials,
      connInfo: {
        server: oldAccountDef.connInfo.server
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities)
    };

    this._loadAccount(universe, accountDef, null, function (account) {
      callback(null, account, null);
    });
  },

  /**
   * Save the account def and folder info for our new (or recreated) account and
   * then load it.
   */
  _loadAccount: function cfg_as__loadAccount(universe, accountDef,
                                             protoConn, callback) {
    // XXX: Just reload the old folders when applicable instead of syncing the
    // folder list again, which is slow.
    var folderInfo = {
      $meta: {
        nextFolderNum: 0,
        nextMutationNum: 0,
        lastFolderSyncAt: 0,
        syncKey: '0',
      },
      $mutations: [],
      $mutationState: {},
    };
    universe.saveAccountDef(accountDef, folderInfo);
    universe._loadAccount(accountDef, folderInfo, protoConn, callback);
  },
};

}); // end define
;