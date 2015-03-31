'use strict';

(function() {
  const CMAS_ID = 'emergency-alert-title',
        CMAS_ENABLED_KEY = 'cmas.enabled';

  // See reference TS in following document, table under section 9.4.1.2.2.
  // http://www.etsi.org/deliver/etsi_ts/123000_123099/123041/11.06.00_60/ts_123041v110600p.pdf
  const GSM_PRESIDENTIAL_ALERTS = [4370, 4383];

  window.navigator.mozSetMessageHandler(
    'cellbroadcast-received',
    onCellbroadcast
  );

  /**
   * Check if the id of the message in in CMAS specific range. Please ref
   * http://www.etsi.org/deliver/etsi_ts/123000_123099/123041/11.06.00_60/
   * ts_123041v110600p.pdf, chapter 9.4.1.2.2 Message Identifier for more
   * details.
   * @param {number} Message ID 
   */
  function isEmergencyAlert(id) {
    return (id >= 4370 && id < 4400);
  }

  function isCmasEnabledForServiceId(serviceId) {
    var getPromise = navigator.mozSettings.createLock().get(CMAS_ENABLED_KEY);

    return getPromise.then(
      result => !!(result[CMAS_ENABLED_KEY][serviceId])
    );
  }

  function isPresidentialAlert(message) {
    return GSM_PRESIDENTIAL_ALERTS.indexOf(message.messageId) !== -1;
  }

  /**
   * Handling the cellbroadcast system message.
   * @param {Object} Cellbroadcast message object which contains necessary
   * information like Identifier and body for displaying attention screen.
   */
  function onCellbroadcast(message) {
    if (!isEmergencyAlert(message.messageId)) {
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
