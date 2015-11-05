/* global bridge,
          BridgeServiceMixin,
          MozMobileMessageClient,
          Settings,
          SMIL
*/
'use strict';

if (!('BridgeServiceMixin' in self)) {
  importScripts('/services/js/bridge_service_mixin.js');
}

if (!('MozMobileMessageClient' in self)) {
  importScripts('/services/js/moz_mobile_message/moz_mobile_message_client.js');
}

(function(exports) {

const SERVICE_NAME = 'messaging-service';

const METHODS = Object.freeze([
  'sendSMS', 'sendMMS', 'resendMessage', 'retrieveMMS'
]);

function ensureBridge() {
  if (!('bridge' in self) || !('service' in bridge)) {
    importScripts('/lib/bridge/service.js');
  }
}

/**
 * 0 is a valid value so we need to take care to not consider it as a falsy
 * value. We want to return null for anything that's not a number or a
 * string containing a number.
 */
function sanitizeServiceId(serviceId) {
  if (serviceId == null || // null or undefined
      isNaN(+serviceId)) {
    serviceId = null;
  } else {
    serviceId = +serviceId;
  }

  return serviceId;
}

function getSendOptionsFromServiceId(serviceId) {
  var sendOpts;

  if (serviceId != null && // not null, not undefined
      Settings.hasSeveralSim()) {
    sendOpts = { serviceId: serviceId };
  }

  return sendOpts;
}

var MessagingService = {
  /**
   * Initializes our service using the Service mixin's initService and
   * requests mozMobileMessage shim as client.
   */
  init() {
    ensureBridge();

    this.initService();
  },

  /**
   * Send sms by using send API shim.
   * @param {String|String[]} recipients Contains the list of recipients for
   *  this message.
   * @param {String} content The message's body.
   * @param {Number|String} serviceId The SIM serviceId we use to send the
   *  message.
   * @param {appInstanceId} appInstanceId Unique id of the app instance
   * requesting service.
   * @returns {Promise} Promise with array of the request result.
   */
  sendSMS({ recipients, content, serviceId }, appInstanceId) {
    recipients = recipients || [];
    serviceId = sanitizeServiceId(serviceId);

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    var sendOpts = getSendOptionsFromServiceId(serviceId);
    var mobileMessageClient = MozMobileMessageClient.forApp(appInstanceId);

    var results = recipients.map((recipient) => {
      return mobileMessageClient.send(recipient, content, sendOpts).then(
        (message) => ({ message: message }), (error) => ({ error: error })
      );
    });

    return Promise.all(results).then((values) =>
      values.map((result, idx) => ({
        success: !result.error,
        result: result.message,
        code: result.error,
        recipient: recipients[idx]
      }))
    );
  },

  /**
   * Send mms by using sendMMS API shim.
   * @param {String|String[]} recipients Recipients for this message.
   * @param {String} subject Subject for this message.
   * @param {Object[]} content This is the content for the message (
   *  see ConversationView for more information).
   * @param {Number|String} serviceId The SIM that should be used for
   *  sending this message. If this is not the current default configuration
   *  for sending MMS, then we'll first switch the configuration to this
   *  serviceId, and only then send the message. That means that the
   *  "sending" event will come quite late in this case.
   * @param {appInstanceId} appInstanceId Unique id of the app instance
   * requesting service.
   * @returns {Promise} DOMRequest promise with success result or error.
   */
  sendMMS({ recipients, content, subject, serviceId }, appInstanceId) {
    serviceId = sanitizeServiceId(serviceId);

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    var message = SMIL.generate(content);

    var sendOpts = getSendOptionsFromServiceId(serviceId);

    return MozMobileMessageClient.forApp(appInstanceId).sendMMS({
      receivers: recipients,
      subject: subject,
      smil: message.smil,
      attachments: message.attachments
    }, sendOpts);
  },

  /**
   * Resend a message by send API shim with existing message information.
   * @param {Message} message Target message that need to be resent.
   * @param {appInstanceId} appInstanceId Unique id of the app instance
   * requesting service.
   * @returns {Promise} DOMRequest promise with success result or error.
   */
  resendMessage(message, appInstanceId) {
    if (!message) {
      throw new Error('Message to resend is not defined.');
    }

    var serviceId = Settings.getServiceIdByIccId(message.iccId);
    var sendOpts = getSendOptionsFromServiceId(serviceId);
    var request;

    var mobileMessageClient = MozMobileMessageClient.forApp(appInstanceId);

    if (message.type === 'sms') {
      request = mobileMessageClient.send(
        message.receiver, message.body, sendOpts
      );
    } else if (message.type === 'mms') {
      request = mobileMessageClient.sendMMS({
        receivers: message.receivers,
        subject: message.subject,
        smil: message.smil,
        attachments: message.attachments
      }, sendOpts);
    }

    return mobileMessageClient.delete(message.id).then(() => request);
  },

  /**
   * Retrieve a MMS by retrieveMMS API shim by message ID.
   * @param {Number} id mms message id for retrieval.
   * @param {appInstanceId} appInstanceId Unique id of the app instance
   * requesting service.
   * @returns {Promise} DOMRequest promise with success result or error.
   */
  retrieveMMS(id, appInstanceId) {
    return MozMobileMessageClient.forApp(appInstanceId).retrieveMMS(id);
  }
};

exports.MessagingService = BridgeServiceMixin.mixin(
  MessagingService,
  SERVICE_NAME,
  { methods: METHODS }
);

if (!self.document) {
  MessagingService.init();
}

})(self);
