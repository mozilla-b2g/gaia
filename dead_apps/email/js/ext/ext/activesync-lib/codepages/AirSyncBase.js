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
