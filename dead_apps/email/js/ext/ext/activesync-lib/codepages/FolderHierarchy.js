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
