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
    root.ASCPCommon = factory();
}(this, function() {
  'use strict';

  return {
    Enums: {
      Status: {
        InvalidContent:                                  '101',
        InvalidWBXML:                                    '102',
        InvalidXML:                                      '103',
        InvalidDateTime:                                 '104',
        InvalidCombinationOfIDs:                         '105',
        InvalidIDs:                                      '106',
        InvalidMIME:                                     '107',
        DeviceIdMissingOrInvalid:                        '108',
        DeviceTypeMissingOrInvalid:                      '109',
        ServerError:                                     '110',
        ServerErrorRetryLater:                           '111',
        ActiveDirectoryAccessDenied:                     '112',
        MailboxQuotaExceeded:                            '113',
        MailboxServerOffline:                            '114',
        SendQuotaExceeded:                               '115',
        MessageRecipientUnresolved:                      '116',
        MessageReplyNotAllowed:                          '117',
        MessagePreviouslySent:                           '118',
        MessageHasNoRecipient:                           '119',
        MailSubmissionFailed:                            '120',
        MessageReplyFailed:                              '121',
        AttachmentIsTooLarge:                            '122',
        UserHasNoMailbox:                                '123',
        UserCannotBeAnonymous:                           '124',
        UserPrincipalCouldNotBeFound:                    '125',
        UserDisabledForSync:                             '126',
        UserOnNewMailboxCannotSync:                      '127',
        UserOnLegacyMailboxCannotSync:                   '128',
        DeviceIsBlockedForThisUser:                      '129',
        AccessDenied:                                    '130',
        AccountDisabled:                                 '131',
        SyncStateNotFound:                               '132',
        SyncStateLocked:                                 '133',
        SyncStateCorrupt:                                '134',
        SyncStateAlreadyExists:                          '135',
        SyncStateVersionInvalid:                         '136',
        CommandNotSupported:                             '137',
        VersionNotSupported:                             '138',
        DeviceNotFullyProvisionable:                     '139',
        RemoteWipeRequested:                             '140',
        LegacyDeviceOnStrictPolicy:                      '141',
        DeviceNotProvisioned:                            '142',
        PolicyRefresh:                                   '143',
        InvalidPolicyKey:                                '144',
        ExternallyManagedDevicesNotAllowed:              '145',
        NoRecurrenceInCalendar:                          '146',
        UnexpectedItemClass:                             '147',
        RemoteServerHasNoSSL:                            '148',
        InvalidStoredRequest:                            '149',
        ItemNotFound:                                    '150',
        TooManyFolders:                                  '151',
        NoFoldersFounds:                                 '152',
        ItemsLostAfterMove:                              '153',
        FailureInMoveOperation:                          '154',
        MoveCommandDisallowedForNonPersistentMoveAction: '155',
        MoveCommandInvalidDestinationFolder:             '156',
        AvailabilityTooManyRecipients:                   '160',
        AvailabilityDLLimitReached:                      '161',
        AvailabilityTransientFailure:                    '162',
        AvailabilityFailure:                             '163',
        BodyPartPreferenceTypeNotSupported:              '164',
        DeviceInformationRequired:                       '165',
        InvalidAccountId:                                '166',
        AccountSendDisabled:                             '167',
        IRM_FeatureDisabled:                             '168',
        IRM_TransientError:                              '169',
        IRM_PermanentError:                              '170',
        IRM_InvalidTemplateID:                           '171',
        IRM_OperationNotPermitted:                       '172',
        NoPicture:                                       '173',
        PictureTooLarge:                                 '174',
        PictureLimitReached:                             '175',
        BodyPart_ConversationTooLarge:                   '176',
        MaximumDevicesReached:                           '177',
      },
    },
  };
}));
