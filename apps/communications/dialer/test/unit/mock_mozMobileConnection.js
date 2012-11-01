'use strict';

requireApp('communications/dialer/js/ussd.js');

const SUCCESS_MMI_NO_MSG = 'sucess_mmi_no_msg';
const FAILED_MMI_NO_MSG = 'failed_mmi_no_msg';
const SUCCESS_MMI_MSG = 'success_mmi_msg';
const FAILED_MMI_MSG = 'failed_mmi_msg';
const USSD_MSG = 'ussd_msg';

var MockMozMobileConnection = {
  addEventListener: function mmmc_addEventListener(event_name, listener) {
  },

  sendMMI: function mmmc_sendMMI(message) {
    var evt = {
      target: {
        result: null,
        error: {
          name: null
        }
      }
    };

    switch (message) {
      case SUCCESS_MMI_NO_MSG:
        evt.target.result = null;
        UssdManager.notifySuccess(evt);
        break;
      case SUCCESS_MMI_MSG:
        evt.target.result = SUCCESS_MMI_MSG;
        UssdManager.notifySuccess(evt);
        break;
      case FAILED_MMI_NO_MSG:
        evt.target.error.name = null;
        UssdManager.notifyError(evt);
        break;
      case FAILED_MMI_MSG:
        evt.target.error.name = FAILED_MMI_MSG;
        UssdManager.notifyError(evt);
        break;
    }

    var domRequest = {};
    return domRequest;
  },

  cancelMMI: function mmmc_cancelMMI() {
    UssdManager.notifySuccess({
      target: {
        result: null
      }
    });
  },

  triggerUssdReceived: function mmmc_triggerUssdReceived(message,
                                                         sessionEnded) {
    UssdManager.handleEvent({
      type: 'ussdreceived',
      message: message,
      sessionEnded: sessionEnded
    });
  },

  teardown: function mmmc_teardown() {
  }
};
