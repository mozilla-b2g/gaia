'use strict';

(function() {
  const CMAS_ID = 'emergency-alert-title',
        CELLBROADCAST_ID = 'cellbroadcast-title';

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
  function getMessageTitle(id) {
    return (id >= 4370 && id < 4400) ? CMAS_ID : CELLBROADCAST_ID;
  }

  /**
   * Handling the cellbroadcast system message.
   * @param {Object} Cellbroadcast message object which contains necessary
   * information like Identifier and body for displaying attention screen.
   */
  function onCellbroadcast(message) {
    // TODO: bug 1051795 : Return directly if alert message settings is off

    var opts = {
      title: getMessageTitle(message.messageId),
      body: message.body
    };
    
    sendAlert(opts);
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

    // TODO: We might need to show cellbroadcast by attention screen in the
    // future.
    if (opts.title === CMAS_ID) {
      window.open(url, '_blank', 'attention');
    }

    window.close();
  }
})();
