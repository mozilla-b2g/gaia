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
    root.ASCPContacts = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Anniversary:               0x0105,
      AssistantName:             0x0106,
      AssistantPhoneNumber:      0x0107,
      Birthday:                  0x0108,
      Body:                      0x0109,
      BodySize:                  0x010A,
      BodyTruncated:             0x010B,
      Business2PhoneNumber:      0x010C,
      BusinessAddressCity:       0x010D,
      BusinessAddressCountry:    0x010E,
      BusinessAddressPostalCode: 0x010F,
      BusinessAddressState:      0x0110,
      BusinessAddressStreet:     0x0111,
      BusinessFaxNumber:         0x0112,
      BusinessPhoneNumber:       0x0113,
      CarPhoneNumber:            0x0114,
      Categories:                0x0115,
      Category:                  0x0116,
      Children:                  0x0117,
      Child:                     0x0118,
      CompanyName:               0x0119,
      Department:                0x011A,
      Email1Address:             0x011B,
      Email2Address:             0x011C,
      Email3Address:             0x011D,
      FileAs:                    0x011E,
      FirstName:                 0x011F,
      Home2PhoneNumber:          0x0120,
      HomeAddressCity:           0x0121,
      HomeAddressCountry:        0x0122,
      HomeAddressPostalCode:     0x0123,
      HomeAddressState:          0x0124,
      HomeAddressStreet:         0x0125,
      HomeFaxNumber:             0x0126,
      HomePhoneNumber:           0x0127,
      JobTitle:                  0x0128,
      LastName:                  0x0129,
      MiddleName:                0x012A,
      MobilePhoneNumber:         0x012B,
      OfficeLocation:            0x012C,
      OtherAddressCity:          0x012D,
      OtherAddressCountry:       0x012E,
      OtherAddressPostalCode:    0x012F,
      OtherAddressState:         0x0130,
      OtherAddressStreet:        0x0131,
      PagerNumber:               0x0132,
      RadioPhoneNumber:          0x0133,
      Spouse:                    0x0134,
      Suffix:                    0x0135,
      Title:                     0x0136,
      WebPage:                   0x0137,
      YomiCompanyName:           0x0138,
      YomiFirstName:             0x0139,
      YomiLastName:              0x013A,
      CompressedRTF:             0x013B,
      Picture:                   0x013C,
      Alias:                     0x013D,
      WeightedRank:              0x013E,
    },
  };
}));
