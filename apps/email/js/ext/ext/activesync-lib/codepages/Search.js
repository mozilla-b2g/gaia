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
    root.ASCPSearch = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Search:         0x0F05,
      Stores:         0x0F06,
      Store:          0x0F07,
      Name:           0x0F08,
      Query:          0x0F09,
      Options:        0x0F0A,
      Range:          0x0F0B,
      Status:         0x0F0C,
      Response:       0x0F0D,
      Result:         0x0F0E,
      Properties:     0x0F0F,
      Total:          0x0F10,
      EqualTo:        0x0F11,
      Value:          0x0F12,
      And:            0x0F13,
      Or:             0x0F14,
      FreeText:       0x0F15,
      DeepTraversal:  0x0F17,
      LongId:         0x0F18,
      RebuildResults: 0x0F19,
      LessThan:       0x0F1A,
      GreaterThan:    0x0F1B,
      Schema:         0x0F1C,
      Supported:      0x0F1D,
      UserName:       0x0F1E,
      Password:       0x0F1F,
      ConversationId: 0x0F20,
      Picture:        0x0F21,
      MaxSize:        0x0F22,
      MaxPictures:    0x0F23,
    },
    Enums: {
      Status: {
        Success:              '1',
        InvalidRequest:       '2',
        ServerError:          '3',
        BadLink:              '4',
        AccessDenied:         '5',
        NotFound:             '6',
        ConnectionFailure:    '7',
        TooComplex:           '8',
        Timeout:             '10',
        SyncFolders:         '11',
        EndOfRange:          '12',
        AccessBlocked:       '13',
        CredentialsRequired: '14',
      }
    }
  };
}));
