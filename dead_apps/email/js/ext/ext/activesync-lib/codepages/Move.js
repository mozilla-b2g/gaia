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
