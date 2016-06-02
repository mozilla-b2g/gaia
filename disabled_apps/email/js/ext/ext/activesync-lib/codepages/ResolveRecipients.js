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
    root.ASCPResolveRecipients = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      ResolveRecipients:      0x0A05,
      Response:               0x0A06,
      Status:                 0x0A07,
      Type:                   0x0A08,
      Recipient:              0x0A09,
      DisplayName:            0x0A0A,
      EmailAddress:           0x0A0B,
      Certificates:           0x0A0C,
      Certificate:            0x0A0D,
      MiniCertificate:        0x0A0E,
      Options:                0x0A0F,
      To:                     0x0A10,
      CertificateRetrieval:   0x0A11,
      RecipientCount:         0x0A12,
      MaxCertificates:        0x0A13,
      MaxAmbiguousRecipients: 0x0A14,
      CertificateCount:       0x0A15,
      Availability:           0x0A16,
      StartTime:              0x0A17,
      EndTime:                0x0A18,
      MergedFreeBusy:         0x0A19,
      Picture:                0x0A1A,
      MaxSize:                0x0A1B,
      Data:                   0x0A1C,
      MaxPictures:            0x0A1D,
    },
    Enums: {
      Status: {
        Success:                   '1',
        AmbiguousRecipientFull:    '2',
        AmbiguousRecipientPartial: '3',
        RecipientNotFound:         '4',
        ProtocolError:             '5',
        ServerError:               '6',
        InvalidSMIMECert:          '7',
        CertLimitReached:          '8',
      },
      CertificateRetrieval: {
        None: '1',
        Full: '2',
        Mini: '3',
      },
      MergedFreeBusy: {
        Free:      '0',
        Tentative: '1',
        Busy:      '2',
        Oof:       '3',
        NoData:    '4',
      },
    },
  };
}));
