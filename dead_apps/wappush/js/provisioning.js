/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(exports) {
  'use strict';

  function Provisioning(obj) {
    if (obj) {
      for (var key in obj) {
        this[key] = obj[key];
      }
    }
  }

  Provisioning.fromMessage = function p_fromMessage(message) {
    var obj = new Provisioning();

    obj.provisioningDoc = message.content;
    obj.authInfo = message.authInfo;
    return obj;
  };

  exports.Provisioning = Provisioning;
})(window);
