define(function() {
  'use strict';

  const NETWORK_TYPE_CATEGORY = {
    'gprs': 'gsm',
    'edge': 'gsm',
    'umts': 'gsm',
    'hsdpa': 'gsm',
    'hsupa': 'gsm',
    'hspa': 'gsm',
    'hspa+': 'gsm',
    'lte': 'gsm',
    'gsm': 'gsm',
    'is95a': 'cdma',
    'is95b': 'cdma',
    '1xrtt': 'cdma',
    'evdo0': 'cdma',
    'evdoa': 'cdma',
    'evdob': 'cdma',
    'ehrpd': 'cdma'
  };

  const CF_REASON = {
    CALL_FORWARD_REASON_UNCONDITIONAL: 0,
    CALL_FORWARD_REASON_MOBILE_BUSY: 1,
    CALL_FORWARD_REASON_NO_REPLY: 2,
    CALL_FORWARD_REASON_NOT_REACHABLE: 3
  };
  
  const CF_REASON_MAPPING = {
    unconditional: CF_REASON.CALL_FORWARD_REASON_UNCONDITIONAL,
    mobilebusy: CF_REASON.CALL_FORWARD_REASON_MOBILE_BUSY,
    noreply: CF_REASON.CALL_FORWARD_REASON_NO_REPLY,
    notreachable: CF_REASON.CALL_FORWARD_REASON_NOT_REACHABLE
  };

  const CF_ACTION = {
    CALL_FORWARD_ACTION_DISABLE: 0,
    CALL_FORWARD_ACTION_ENABLE: 1,
    CALL_FORWARD_ACTION_QUERY_STATUS: 2,
    CALL_FORWARD_ACTION_REGISTRATION: 3,
    CALL_FORWARD_ACTION_ERASURE: 4
  };

  const CLIR_MAPPING = {
    CLIR_DEFAULT: 0,
    CLIR_INVOCATION: 1,
    CLIR_SUPPRESSION: 2
  };

  return {
    NETWORK_TYPE_CATEGORY: NETWORK_TYPE_CATEGORY,
    CF_REASON: CF_REASON,
    CF_REASON_MAPPING: CF_REASON_MAPPING,
    CF_ACTION: CF_ACTION,
    CLIR_MAPPING: CLIR_MAPPING
  };
});
