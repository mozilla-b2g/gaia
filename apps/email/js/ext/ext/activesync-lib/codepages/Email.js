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
    root.ASCPEmail = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Attachment:              0x0205,
      Attachments:             0x0206,
      AttName:                 0x0207,
      AttSize:                 0x0208,
      Att0Id:                  0x0209,
      AttMethod:               0x020A,
      AttRemoved:              0x020B,
      Body:                    0x020C,
      BodySize:                0x020D,
      BodyTruncated:           0x020E,
      DateReceived:            0x020F,
      DisplayName:             0x0210,
      DisplayTo:               0x0211,
      Importance:              0x0212,
      MessageClass:            0x0213,
      Subject:                 0x0214,
      Read:                    0x0215,
      To:                      0x0216,
      Cc:                      0x0217,
      From:                    0x0218,
      ReplyTo:                 0x0219,
      AllDayEvent:             0x021A,
      Categories:              0x021B,
      Category:                0x021C,
      DTStamp:                 0x021D,
      EndTime:                 0x021E,
      InstanceType:            0x021F,
      BusyStatus:              0x0220,
      Location:                0x0221,
      MeetingRequest:          0x0222,
      Organizer:               0x0223,
      RecurrenceId:            0x0224,
      Reminder:                0x0225,
      ResponseRequested:       0x0226,
      Recurrences:             0x0227,
      Recurrence:              0x0228,
      Recurrence_Type:         0x0229,
      Recurrence_Until:        0x022A,
      Recurrence_Occurrences:  0x022B,
      Recurrence_Interval:     0x022C,
      Recurrence_DayOfWeek:    0x022D,
      Recurrence_DayOfMonth:   0x022E,
      Recurrence_WeekOfMonth:  0x022F,
      Recurrence_MonthOfYear:  0x0230,
      StartTime:               0x0231,
      Sensitivity:             0x0232,
      TimeZone:                0x0233,
      GlobalObjId:             0x0234,
      ThreadTopic:             0x0235,
      MIMEData:                0x0236,
      MIMETruncated:           0x0237,
      MIMESize:                0x0238,
      InternetCPID:            0x0239,
      Flag:                    0x023A,
      Status:                  0x023B,
      ContentClass:            0x023C,
      FlagType:                0x023D,
      CompleteTime:            0x023E,
      DisallowNewTimeProposal: 0x023F,
    },
    Enums: {
      Importance: {
        Low:    '0',
        Normal: '1',
        High:   '2',
      },
      InstanceType: {
        Single:             '0',
        RecurringMaster:    '1',
        RecurringInstance:  '2',
        RecurringException: '3',
      },
      BusyStatus: {
        Free:      '0',
        Tentative: '1',
        Busy:      '2',
        Oof:       '3',
      },
      Recurrence_Type: {
        Daily:             '0',
        Weekly:             '1',
        MonthlyNthDay:      '2',
        Monthly:            '3',
        YearlyNthDay:       '5',
        YearlyNthDayOfWeek: '6',
      },
      /* XXX: missing Recurrence_DayOfWeek */
      Sensitivity: {
        Normal:       '0',
        Personal:     '1',
        Private:      '2',
        Confidential: '3',
      },
      Status: {
        Cleared:  '0',
        Complete: '1',
        Active:   '2',
      },
    },
  };
}));
