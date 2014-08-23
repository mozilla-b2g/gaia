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
    root.ASCPEmail2 = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      UmCallerID:            0x1605,
      UmUserNotes:           0x1606,
      UmAttDuration:         0x1607,
      UmAttOrder:            0x1608,
      ConversationId:        0x1609,
      ConversationIndex:     0x160A,
      LastVerbExecuted:      0x160B,
      LastVerbExecutionTime: 0x160C,
      ReceivedAsBcc:         0x160D,
      Sender:                0x160E,
      CalendarType:          0x160F,
      IsLeapMonth:           0x1610,
      AccountId:             0x1611,
      FirstDayOfWeek:        0x1612,
      MeetingMessageType:    0x1613,
    },
    Enums: {
      LastVerbExecuted: {
        Unknown:       '0',
        ReplyToSender: '1',
        ReplyToAll:    '2',
        Forward:       '3',
      },
      CalendarType: {
        Default:                     '0',
        Gregorian:                   '1',
        GregorianUS:                 '2',
        Japan:                       '3',
        Taiwan:                      '4',
        Korea:                       '5',
        Hijri:                       '6',
        Thai:                        '7',
        Hebrew:                      '8',
        GregorianMeFrench:           '9',
        GregorianArabic:            '10',
        GregorianTranslatedEnglish: '11',
        GregorianTranslatedFrench:  '12',
        JapaneseLunar:              '14',
        ChineseLunar:               '15',
        KoreanLunar:                '20',
      },
      FirstDayOfWeek: {
        Sunday:    '0',
        Monday:    '1',
        Tuesday:   '2',
        Wednesday: '3',
        Thursday:  '4',
        Friday:    '5',
        Saturday:  '6',
      },
      MeetingMessageType: {
        Unspecified:         '0',
        InitialRequest:      '1',
        FullUpdate:          '2',
        InformationalUpdate: '3',
        Outdated:            '4',
        DelegatorsCopy:      '5',
        Delegated:           '6',
      }
    }
  };
}));
