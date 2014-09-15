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
    root.ASCPSettings = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Settings:                    0x1205,
      Status:                      0x1206,
      Get:                         0x1207,
      Set:                         0x1208,
      Oof:                         0x1209,
      OofState:                    0x120A,
      StartTime:                   0x120B,
      EndTime:                     0x120C,
      OofMessage:                  0x120D,
      AppliesToInternal:           0x120E,
      AppliesToExternalKnown:      0x120F,
      AppliesToExternalUnknown:    0x1210,
      Enabled:                     0x1211,
      ReplyMessage:                0x1212,
      BodyType:                    0x1213,
      DevicePassword:              0x1214,
      Password:                    0x1215,
      DeviceInformation:           0x1216,
      Model:                       0x1217,
      IMEI:                        0x1218,
      FriendlyName:                0x1219,
      OS:                          0x121A,
      OSLanguage:                  0x121B,
      PhoneNumber:                 0x121C,
      UserInformation:             0x121D,
      EmailAddresses:              0x121E,
      SmtpAddress:                 0x121F,
      UserAgent:                   0x1220,
      EnableOutboundSMS:           0x1221,
      MobileOperator:              0x1222,
      PrimarySmtpAddress:          0x1223,
      Accounts:                    0x1224,
      Account:                     0x1225,
      AccountId:                   0x1226,
      AccountName:                 0x1227,
      UserDisplayName:             0x1228,
      SendDisabled:                0x1229,
      /* Missing tag value 0x122A */
      RightsManagementInformation: 0x122B,
    },
    Enums: {
      Status: {
        Success:              '1',
        ProtocolError:        '2',
        AccessDenied:         '3',
        ServerError:          '4',
        InvalidArguments:     '5',
        ConflictingArguments: '6',
        DeniedByPolicy:       '7',
      },
      OofState: {
        Disabled:  '0',
        Global:    '1',
        TimeBased: '2',
      }
    }
  };
}));
