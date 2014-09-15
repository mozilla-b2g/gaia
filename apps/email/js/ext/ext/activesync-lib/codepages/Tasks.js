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
    root.ASCPTasks = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Body:                   0x0905,
      BodySize:               0x0906,
      BodyTruncated:          0x0907,
      Categories:             0x0908,
      Category:               0x0909,
      Complete:               0x090A,
      DateCompleted:          0x090B,
      DueDate:                0x090C,
      UtcDueDate:             0x090D,
      Importance:             0x090E,
      Recurrence:             0x090F,
      Recurrence_Type:        0x0910,
      Recurrence_Start:       0x0911,
      Recurrence_Until:       0x0912,
      Recurrence_Occurrences: 0x0913,
      Recurrence_Interval:    0x0914,
      Recurrence_DayOfMonth:  0x0915,
      Recurrence_DayOfWeek:   0x0916,
      Recurrence_WeekOfMonth: 0x0917,
      Recurrence_MonthOfYear: 0x0918,
      Recurrence_Regenerate:  0x0919,
      Recurrence_DeadOccur:   0x091A,
      ReminderSet:            0x091B,
      ReminderTime:           0x091C,
      Sensitivity:            0x091D,
      StartDate:              0x091E,
      UtcStartDate:           0x091F,
      Subject:                0x0920,
      CompressedRTF:          0x0921,
      OrdinalDate:            0x0922,
      SubOrdinalDate:         0x0923,
      CalendarType:           0x0924,
      IsLeapMonth:            0x0925,
      FirstDayOfWeek:         0x0926,
    }
  };
}));
