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
    root.ASCPCalendar = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      TimeZone:                  0x0405,
      AllDayEvent:               0x0406,
      Attendees:                 0x0407,
      Attendee:                  0x0408,
      Email:                     0x0409,
      Name:                      0x040A,
      Body:                      0x040B,
      BodyTruncated:             0x040C,
      BusyStatus:                0x040D,
      Categories:                0x040E,
      Category:                  0x040F,
      CompressedRTF:             0x0410,
      DtStamp:                   0x0411,
      EndTime:                   0x0412,
      Exception:                 0x0413,
      Exceptions:                0x0414,
      Deleted:                   0x0415,
      ExceptionStartTime:        0x0416,
      Location:                  0x0417,
      MeetingStatus:             0x0418,
      OrganizerEmail:            0x0419,
      OrganizerName:             0x041A,
      Recurrence:                0x041B,
      Type:                      0x041C,
      Until:                     0x041D,
      Occurrences:               0x041E,
      Interval:                  0x041F,
      DayOfWeek:                 0x0420,
      DayOfMonth:                0x0421,
      WeekOfMonth:               0x0422,
      MonthOfYear:               0x0423,
      Reminder:                  0x0424,
      Sensitivity:               0x0425,
      Subject:                   0x0426,
      StartTime:                 0x0427,
      UID:                       0x0428,
      AttendeeStatus:            0x0429,
      AttendeeType:              0x042A,
      Attachment:                0x042B,
      Attachments:               0x042C,
      AttName:                   0x042D,
      AttSize:                   0x042E,
      AttOid:                    0x042F,
      AttMethod:                 0x0430,
      AttRemoved:                0x0431,
      DisplayName:               0x0432,
      DisallowNewTimeProposal:   0x0433,
      ResponseRequested:         0x0434,
      AppointmentReplyTime:      0x0435,
      ResponseType:              0x0436,
      CalendarType:              0x0437,
      IsLeapMonth:               0x0438,
      FirstDayOfWeek:            0x0439,
      OnlineMeetingConfLink:     0x043A,
      OnlineMeetingExternalLink: 0x043B,
    },
  };
}));
