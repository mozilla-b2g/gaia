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
    root.ASCPValidateCert = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      ValidateCert:     0x0B05,
      Certificates:     0x0B06,
      Certificate:      0x0B07,
      CertificateChain: 0x0B08,
      CheckCRL:         0x0B09,
      Status:           0x0B0A,
    },
    Enums: {
      Status: {
        Success:               '1',
        ProtocolError:         '2',
        InvalidSignature:      '3',
        UntrustedSource:       '4',
        InvalidChain:          '5',
        NotForEmail:           '6',
        Expired:               '7',
        InconsistentTimes:     '8',
        IdMisused:             '9',
        MissingInformation:   '10',
        CAEndMismatch:        '11',
        EmailAddressMismatch: '12',
        Revoked:              '13',
        ServerOffline:        '14',
        ChainRevoked:         '15',
        RevocationUnknown:    '16',
        UnknownError:         '17',
      },
    },
  };
}));
