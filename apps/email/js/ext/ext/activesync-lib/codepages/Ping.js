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
    root.ASCPPing = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Ping:              0x0D05,
      AutdState:         0x0D06,
      Status:            0x0D07,
      HeartbeatInterval: 0x0D08,
      Folders:           0x0D09,
      Folder:            0x0D0A,
      Id:                0x0D0B,
      Class:             0x0D0C,
      MaxFolders:        0x0D0D,
    },
    Enums: {
      Status: {
        Expired:           '1',
        Changed:           '2',
        MissingParameters: '3',
        SyntaxError:       '4',
        InvalidInterval:   '5',
        TooManyFolders:    '6',
        SyncFolders:       '7',
        ServerError:       '8',
      },
    },
  };
}));
