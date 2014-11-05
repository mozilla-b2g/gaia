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
    root.ASCPContacts2 = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      CustomerId:       0x0C05,
      GovernmentId:     0x0C06,
      IMAddress:        0x0C07,
      IMAddress2:       0x0C08,
      IMAddress3:       0x0C09,
      ManagerName:      0x0C0A,
      CompanyMainPhone: 0x0C0B,
      AccountName:      0x0C0C,
      NickName:         0x0C0D,
      MMS:              0x0C0E,
    }
  };
}));
