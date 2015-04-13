'use strict';

// See reference TS in following document for GSM and CDMA:
// [1] GSM:
// http://www.etsi.org/deliver/etsi_ts/123000_123099/123041/11.06.00_60/ts_123041v110600p.pdf
//       
// [2] CDMA:
// http://www.3gpp2.org/public_html/specs/C.R1001-G_v1.0_Param_Administration.pdf

(function() {
  const CMAS_ID = 'emergency-alert-title',
        CMAS_ENABLED_KEY = 'cmas.enabled';

  // See GSM[1] section 9.4.1.2.2 Message Identifier and
  // CDMA[2] section 9.3.3 Commercial Mobile for thet presidential alerts
  const GSM_PRESIDENTIAL_ALERTS = [4370, 4383];
  const CDMA_PRESIDENTIAL_ALERT = 0x1000;

  window.navigator.mozSetMessageHandler(
    'cellbroadcast-received',
    onCellbroadcast
  );

  /**
   * Check if the id of the message in in CMAS specific range. Please ref link
   * above for GSM[1] and CDMA[2]
   *
   * @param {number} Message
   */
  function isEmergencyAlert(message) {
    var messageId = message.messageId;
    var cdmaServiceCategory = message.cdmaServiceCategory;
    var isGSM = cdmaServiceCategory === null;

    if (isGSM) {
      return (messageId >= 4370 && messageId < 4400);
    } else {
      return (cdmaServiceCategory >= 0x1000 && cdmaServiceCategory <= 0x10FF);
    }
  }

  function isCmasEnabledForServiceId(serviceId) {
    var getPromise = navigator.mozSettings.createLock().get(CMAS_ENABLED_KEY);

    return getPromise.then(
      result => !!(result[CMAS_ENABLED_KEY][serviceId])
    );
  }

  function isPresidentialAlert(message) {
    var messageId = message.messageId;
    var cdmaServiceCategory = message.cdmaServiceCategory;
    var isGSM = cdmaServiceCategory === null;

    if (isGSM) {
      return GSM_PRESIDENTIAL_ALERTS.indexOf(messageId) !== -1;
    } else {
      return CDMA_PRESIDENTIAL_ALERT === cdmaServiceCategory;
    }
  }

  /**
   * Handling the cellbroadcast system message.
   * @param {Object} Cellbroadcast message object which contains necessary
   * information like Identifier and body for displaying attention screen.
   */
  function onCellbroadcast(message) {
    if (!isEmergencyAlert(message)) {
      window.close();
      return;
    }

    var shouldSendAlertPromise =
      isPresidentialAlert(message) ?
      Promise.resolve(true) :
      isCmasEnabledForServiceId(message.serviceId).catch((e) => {
        console.error('CMAS: Unable to query settings database', e);
        return false;
      });

    return shouldSendAlertPromise.then((yes) => {
      if (yes) {
        sendAlert({
          title: CMAS_ID,
          body: message.body
        });
        // Do not close window here because it will close attention screen
      } else {
        window.close();
      }
    });
  }

  /**
   * Open CMAS alert attention screen with given message body content and 
   * title.
   * @param {Object} Options object that contains the title l10n id and message
   * body.
   */
  function sendAlert(opts) {
    var url = [
      'attention.html?title=',
      encodeURIComponent(opts.title),
      '&body=',
      encodeURIComponent(opts.body)
    ].join('');

    window.open(url, '_blank', 'attention');
  }
})();
