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
    root.ASCPProvision = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Provision:                                0x0E05,
      Policies:                                 0x0E06,
      Policy:                                   0x0E07,
      PolicyType:                               0x0E08,
      PolicyKey:                                0x0E09,
      Data:                                     0x0E0A,
      Status:                                   0x0E0B,
      RemoteWipe:                               0x0E0C,
      EASProvisionDoc:                          0x0E0D,
      DevicePasswordEnabled:                    0x0E0E,
      AlphanumericDevicePasswordRequired:       0x0E0F,
      DeviceEncryptionEnabled:                  0x0E10,
      RequireStorageCardEncryption:             0x0E10,
      PasswordRecoveryEnabled:                  0x0E11,
      AttachmentsEnabled:                       0x0E13,
      MinDevicePasswordLength:                  0x0E14,
      MaxInactivityTimeDeviceLock:              0x0E15,
      MaxDevicePasswordFailedAttempts:          0x0E16,
      MaxAttachmentSize:                        0x0E17,
      AllowSimpleDevicePassword:                0x0E18,
      DevicePasswordExpiration:                 0x0E19,
      DevicePasswordHistory:                    0x0E1A,
      AllowStorageCard:                         0x0E1B,
      AllowCamera:                              0x0E1C,
      RequireDeviceEncryption:                  0x0E1D,
      AllowUnsignedApplications:                0x0E1E,
      AllowUnsignedInstallationPackages:        0x0E1F,
      MinDevicePasswordComplexCharacters:       0x0E20,
      AllowWiFi:                                0x0E21,
      AllowTextMessaging:                       0x0E22,
      AllowPOPIMAPEmail:                        0x0E23,
      AllowBluetooth:                           0x0E24,
      AllowIrDA:                                0x0E25,
      RequireManualSyncWhenRoaming:             0x0E26,
      AllowDesktopSync:                         0x0E27,
      MaxCalendarAgeFilter:                     0x0E28,
      AllowHTMLEmail:                           0x0E29,
      MaxEmailAgeFilter:                        0x0E2A,
      MaxEmailBodyTruncationSize:               0x0E2B,
      MaxEmailHTMLBodyTruncationSize:           0x0E2C,
      RequireSignedSMIMEMessages:               0x0E2D,
      RequireEncryptedSMIMEMessages:            0x0E2E,
      RequireSignedSMIMEAlgorithm:              0x0E2F,
      RequireEncryptionSMIMEAlgorithm:          0x0E30,
      AllowSMIMEEncryptionAlgorithmNegotiation: 0x0E31,
      AllowSMIMESoftCerts:                      0x0E32,
      AllowBrowser:                             0x0E33,
      AllowConsumerEmail:                       0x0E34,
      AllowRemoteDesktop:                       0x0E35,
      AllowInternetSharing:                     0x0E36,
      UnapprovedInROMApplicationList:           0x0E37,
      ApplicationName:                          0x0E38,
      ApprovedApplicationList:                  0x0E39,
      Hash:                                     0x0E3A,
    }
  };
}));
