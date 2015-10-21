/* global bridge,
          BridgeServiceMixin,
          BroadcastChannel,
          Settings,
          SMIL
*/
'use strict';

if (!('BridgeServiceMixin' in self)) {
  importScripts('/services/js/bridge_service_mixin.js');
}

(function(exports) {

const SERVICE_NAME = 'messaging-service';
const MOBILE_MESSAGE_CLIENT_NAME = 'moz-mobile-message-shim';
/**
 * Disable default client timeout from bridge by setting the timeout to false.
 * @type {number|boolean}
 */
const TIMEOUT = false;

const METHODS = Object.freeze([
  'sendSMS', 'sendMMS', 'resendMessage', 'retrieveMMS'
]);

function ensureBridge() {
  if (!('bridge' in self)) {
    importScripts('/lib/bridge/bridge.js');
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

    // TODO: Will need to give an unique name for BroadcastChannel to classify
    // the connections between different instances and avoid all the connections
    // closed because one of the instance is killed.
    this.mozMobileMessageClient = bridge.client({
      service: MOBILE_MESSAGE_CLIENT_NAME,
      endpoint: new BroadcastChannel(MOBILE_MESSAGE_CLIENT_NAME + '-channel'),
      timeout: TIMEOUT
    });
  },

  /**
   * Send sms by using send API shim.
   * @param {String|String[]} recipients Contains the list of recipients for
   *  this message.
   * @param {String} content The message's body.
   * @param {Number|String} serviceId The SIM serviceId we use to send the
   *  message.
   * @returns {Promise} Promise with array of the request result.
   */
  sendSMS({ recipients, content, serviceId }) {
    recipients = recipients || [];
    serviceId = sanitizeServiceId(serviceId);

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    var sendOpts = getSendOptionsFromServiceId(serviceId);
    var results = recipients.map(
      (recipient) => this.mozMobileMessageClient.method(
        'send', recipient, content, sendOpts
      ).then(
        (message) => ({ message: message }),
        (error) => ({ error: error })
      )
    );

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
   * @returns {Promise} DOMRequest promise with success result or error.
   */
  sendMMS({ recipients, content, subject, serviceId }) {
    serviceId = sanitizeServiceId(serviceId);

    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    var message = SMIL.generate(content);

    var sendOpts = getSendOptionsFromServiceId(serviceId);

    return this.mozMobileMessageClient.method('sendMMS', {
      receivers: recipients,
      subject: subject,
      smil: message.smil,
      attachments: message.attachments
    }, sendOpts);
  },

  /**
   * Resend a message by send API shim with existing message information.
   * @param {Message} message Target message that need to be resent.
   * @returns {Promise} DOMRequest promise with success result or error.
   */
  resendMessage(message) {
    if (!message) {
      throw new Error('Message to resend is not defined.');
    }

    var serviceId = Settings.getServiceIdByIccId(message.iccId);
    var sendOpts = getSendOptionsFromServiceId(serviceId);
    var request;

    if (message.type === 'sms') {
      request = this.mozMobileMessageClient.method(
        'send', message.receiver, message.body, sendOpts
      );
    }
    if (message.type === 'mms') {
      request = this.mozMobileMessageClient.method('sendMMS', {
        receivers: message.receivers,
        subject: message.subject,
        smil: message.smil,
        attachments: message.attachments
      }, sendOpts);
    }

    return this.mozMobileMessageClient.method('delete', message.id).then(() =>
      request
    );
  },

  /**
   * Retrieve a MMS by retrieveMMS API shim by message ID.
   * @param {Number} id mms message id for retrieval.
   * @returns {Promise} DOMRequest promise with success result or error.
   */
  retrieveMMS(id) {
    return this.mozMobileMessageClient.method('retrieveMMS', id);
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
