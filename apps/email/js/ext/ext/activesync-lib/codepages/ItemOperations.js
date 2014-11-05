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
