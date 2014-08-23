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
