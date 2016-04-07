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
    root.ASCPGAL = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      DisplayName:  0x1005,
      Phone:        0x1006,
      Office:       0x1007,
      Title:        0x1008,
      Company:      0x1009,
      Alias:        0x100A,
      FirstName:    0x100B,
      LastName:     0x100C,
      HomePhone:    0x100D,
      MobilePhone:  0x100E,
      EmailAddress: 0x100F,
      Picture:      0x1010,
      Status:       0x1011,
      Data:         0x1012,
    }
  };
}));
