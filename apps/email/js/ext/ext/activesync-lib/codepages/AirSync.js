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
    define([], factory);
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
