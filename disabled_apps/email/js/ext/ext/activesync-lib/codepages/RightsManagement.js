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
    root.ASCPRightsManagement = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      RightsManagementSupport:            0x1805,
      RightsManagementTemplates:          0x1806,
      RightsManagementTemplate:           0x1807,
      RightsManagementLicense:            0x1808,
      EditAllowed:                        0x1809,
      ReplyAllowed:                       0x180A,
      ReplyAllAllowed:                    0x180B,
      ForwardAllowed:                     0x180C,
      ModifyRecipientsAllowed:            0x180D,
      ExtractAllowed:                     0x180E,
      PrintAllowed:                       0x180F,
      ExportAllowed:                      0x1810,
      ProgrammaticAccessAllowed:          0x1811,
      Owner:                              0x1812,
      ContentExpiryDate:                  0x1813,
      TemplateID:                         0x1814,
      TemplateName:                       0x1815,
      TemplateDescription:                0x1816,
      ContentOwner:                       0x1817,
      RemoveRightsManagementDistribution: 0x1818,
    }
  };
}));
