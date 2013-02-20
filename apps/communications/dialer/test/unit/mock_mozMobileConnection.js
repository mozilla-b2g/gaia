'use strict';

requireApp('communications/dialer/js/ussd.js');

const SUCCESS_MMI_NO_MSG = 'sucess_mmi_no_msg';
const FAILED_MMI_NO_MSG = 'failed_mmi_no_msg';
const SUCCESS_MMI_MSG = 'success_mmi_msg';
const FAILED_MMI_MSG = 'failed_mmi_msg';

const USSD_MSG = 'ussd_msg';

const MMI_CF_MSG_ACTIVE_VOICE = 'mmi_cf_active_voice';
const MMI_CF_MSG_ACTIVE_DATA = 'mmi_cf_active_data';
const MMI_CF_MSG_ACTIVE_FAX = 'mmi_cf_active_fax';
const MMI_CF_MSG_ACTIVE_SMS = 'mmi_cf_active_sms';
const MMI_CF_MSG_ACTIVE_DATA_SYNC = 'mmi_cf_active_data_sync';
const MMI_CF_MSG_ACTIVE_DATA_ASYNC = 'mmi_cf_active_data_async';
const MMI_CF_MSG_ACTIVE_PACKET = 'mmi_cf_active_package';
const MMI_CF_MSG_ACTIVE_PAD = 'mmi_cf_active_pad';
const MMI_CF_MSG_INVALID_SERVICE_CLASS = 'mmi_cf_invalid_sc';
const MMI_CF_MSG_ALL_INACTIVE = 'mmi_cf_all_inactive';
const MMI_CF_MSG_TWO_RULES = 'mmi_cf_two_rules';

const EXPECTED_PHONE = '+34666222111';

var MockMozMobileConnection = {
  ICC_SERVICE_CLASS_VOICE: (1 << 0),
  ICC_SERVICE_CLASS_DATA: (1 << 1),
  ICC_SERVICE_CLASS_FAX: (1 << 2),
  ICC_SERVICE_CLASS_SMS: (1 << 3),
  ICC_SERVICE_CLASS_DATA_SYNC: (1 << 4),
  ICC_SERVICE_CLASS_DATA_ASYNC: (1 << 5),
  ICC_SERVICE_CLASS_PACKET: (1 << 6),
  ICC_SERVICE_CLASS_PAD: (1 << 7),
  ICC_SERVICE_CLASS_MAX: (1 << 7),

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
      case MMI_CF_MSG_ACTIVE_VOICE:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_VOICE
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_DATA:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_DATA
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_FAX:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_FAX
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_DATA_SYNC:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_DATA_SYNC
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_DATA_ASYNC:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_DATA_ASYNC
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_PACKET:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_PACKET
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_PAD:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_PAD
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_INVALID_SERVICE_CLASS:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: -1
        }];
        UssdManager.notifySuccess(evt);
        break;
     case MMI_CF_MSG_TWO_RULES:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_VOICE
        },{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: this.ICC_SERVICE_CLASS_DATA
        }];
        UssdManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ALL_INACTIVE:
        evt.target.result = [{
          active: false
        }];
        UssdManager.notifySuccess(evt);
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
