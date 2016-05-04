/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global ActivityClient,
         App,
         Attachment,
         Draft,
         Drafts,
         MessageManager,
         Navigation,
         Settings,
         Utils
*/
/*exported ActivityHandler */

'use strict';

/**
 * Describes available data types that can be associated with the activities.
 * @enum {string}
 */
const ActivityDataType = {
  IMAGE: 'image/*',
  AUDIO: 'audio/*',
  VIDEO: 'video/*',
  URL: 'url',
  VCARD: 'text/vcard'
};

var ActivityHandler = {
  init: function() {
    ActivityClient.init(App.instanceId);

    ActivityClient.on(
      'new-activity-request', this._onNewActivity.bind(this)
    );

    ActivityClient.on(
      'share-activity-request', this._onShareActivity.bind(this)
    );
  },

  _onNewActivity: function newHandler(activityData) {
    var viewInfo = {
      body: activityData.body,
      number: activityData.target || activityData.number,
      threadId: null
    };

    var threadPromise;
    var focus = '';
    if (viewInfo.number) {
      // It's reasonable to focus on composer if we already have some phone
      // number or even contact to fill recipients input
      focus = 'composer';

      /* If we have a body, we're always redirecting to the new message view,
       * because we don't want to overwrite any possible draft from an existing
       * conversation. */
      if (!viewInfo.body) {
        // try to get a thread from number
        // if no thread, promise is rejected and we try to find a contact
        threadPromise = MessageManager.findThreadFromNumber(viewInfo.number)
          .then((threadId) => viewInfo.threadId = threadId)
          // case no contact and no thread id: gobble the error
          .catch(() => {});
      }
    }

    return (threadPromise || Promise.resolve()).then(
      () => this.toView(viewInfo, focus)
    );
  },

  _onShareActivity: function shareHandler(activityData) {
    var dataToShare = null;

    switch(activityData.type) {
      case ActivityDataType.AUDIO:
      case ActivityDataType.VIDEO:
      case ActivityDataType.IMAGE:
        var attachments = activityData.blobs.map(function(blob, idx) {
          var attachment = new Attachment(blob, {
            name: activityData.filenames[idx],
            isDraft: true
          });

          return attachment;
        });

        var size = attachments.reduce(function(size, attachment) {
          if (attachment.type !== 'img') {
            size += attachment.size;
          }

          return size;
        }, 0);

        if (size > Settings.mmsSizeLimitation) {
          Utils.alert({
            id: 'attached-files-too-large',
            args: {
              n: activityData.blobs.length,
              mmsSize: (Settings.mmsSizeLimitation / 1024).toFixed(0)
            }
          }).then(() => ActivityClient.postResult());
          return;
        }

        dataToShare = attachments;
        break;
      case ActivityDataType.URL:
        dataToShare = activityData.url;
        break;
      // As for the moment we only allow to share one vcard we treat this case
      // in an specific block
      case ActivityDataType.VCARD:
        dataToShare = new Attachment(activityData.blobs[0], {
          name: activityData.filenames[0],
          isDraft: true
        });
        break;
      default:
        ActivityClient.postError(
          'Unsupported activity data type: ' + activityData.type
        );
        return;
    }

    if (!dataToShare) {
      ActivityClient.postError('No data to share found!');
      return;
    }

    return this.toView({ body: dataToShare });
  },

  /**
   * Store a draft for this message, and returns a draftId.
   *
   * @param {Object} message Message to save
   * @param {Number} message.threadId Conversation where this messages is
   * located.
   * @param {String} message.number The recipient as a phone number or email
   * address.
   * @param {(String|Attachment|Array.<Attachment>)} [message.body] The data to
   * add to the message's body.
   * @returns {Promise.<Number>} The new draft id.
   */
  _storeDraftFromMessage(message) {
    var content = message.body || null;

    var isSimpleContent = !content || typeof content === 'string';
    var isEmailAddress = message.number && Utils.isEmailAddress(message.number);

    var draft = new Draft({
      threadId: message.threadId || null,
      recipients: message.number && [message.number] || null,
      content: !content || Array.isArray(content) ? content : [content],
      type: isSimpleContent && !isEmailAddress ? 'sms' : 'mms'
    });

    return Drafts.request().then(
      () => Drafts.add(draft).store()
    ).then(() => draft.id);
  },

  /**
   * Delivers the user to the correct view based on the params provided in the
   * "message" parameter.
   * @param {{number: string, body: string, threadId: number}} message It's
   * either a message object that belongs to a thread, or a message object from
   * the system. "number" is a string phone number to pre-populate the
   * recipients list with, "body" is an optional body to preset the compose
   * input with, "threadId" is an optional threadId corresponding to a new or
   * existing thread.
   * @param {string?} focus indicates which of 'composer' or 'recipients' field
   * we need to focus when we navigate to Thread panel.
   */
  toView: function ah_toView(message, focus) {
    return Utils.onceDocumentIsVisible().then(() => {
      // If we have appropriate thread then let's forward user there, otherwise
      // open new message composer.
      if (message.threadId) {
        return Navigation.toPanel('thread', {
          id: message.threadId,
          focus
        });
      }

      return this._storeDraftFromMessage(message).then(
        (draftId) => Navigation.toPanel('composer', { draftId, focus })
      );
    });
  }
};
