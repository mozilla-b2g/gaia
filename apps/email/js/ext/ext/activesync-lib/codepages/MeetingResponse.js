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
    root.ASCPMeetingResponse = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      CalendarId:      0x0805,
      CollectionId:    0x0806,
      MeetingResponse: 0x0807,
      RequestId:       0x0808,
      Request:         0x0809,
      Result:          0x080A,
      Status:          0x080B,
      UserResponse:    0x080C,
      InstanceId:      0x080E,
    },
    Enums: {
      Status: {
        Success:        '1',
        InvalidRequest: '2',
        MailboxError:   '3',
        ServerError:    '4',
      },
      UserResponse: {
        Accepted:  '1',
        Tentative: '2',
        Declined:  '3',
      },
    },
  };
}));
