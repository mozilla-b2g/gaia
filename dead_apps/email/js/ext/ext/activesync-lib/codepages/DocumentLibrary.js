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
    root.ASCPDocumentLibrary = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      LinkId:           0x1305,
      DisplayName:      0x1306,
      IsFolder:         0x1307,
      CreationDate:     0x1308,
      LastModifiedDate: 0x1309,
      IsHidden:         0x130A,
      ContentLength:    0x130B,
      ContentType:      0x130C,
    },
  };
}));
