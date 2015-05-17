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

  const CALL_FORWARD_REASON = {
    'UNCONDITIONAL': 0,
    'MOBILE_BUSY': 1,
    'NO_REPLY': 2,
    'NOT_REACHABLE': 3
  };

  const CALL_FORWARD_REASON_MAPPING = {
    'unConditional': CALL_FORWARD_REASON.UNCONDITIONAL,
    'mobileBusy': CALL_FORWARD_REASON.MOBILE_BUSY,
    'noReply': CALL_FORWARD_REASON.NO_REPLY,
    'notReachable': CALL_FORWARD_REASON.NOT_REACHABLE
  };

  const CALL_FORWARD_ACTION = {
    'DISABLE': 0,
    'ENABLE': 1,
    'QUERY_STATUS': 2,
    'REGISTRATION': 3,
    'ERASURE': 4
  };

  const CLIR_MAPPING = {
    'CLIR_DEFAULT': 0,
    'CLIR_INVOCATION': 1,
    'CLIR_SUPPRESSION': 2
  };

  const CallConstant = {
    'NETWORK_TYPE_CATEGORY': NETWORK_TYPE_CATEGORY,
    'CALL_FORWARD_REASON': CALL_FORWARD_REASON,
    'CALL_FORWARD_REASON_MAPPING': CALL_FORWARD_REASON_MAPPING,
    'CALL_FORWARD_ACTION': CALL_FORWARD_ACTION,
    'CLIR_MAPPING': CLIR_MAPPING
  };

  return CallConstant;
});
