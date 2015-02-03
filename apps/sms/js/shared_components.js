'use strict';

/*global Map, Template*/

/*exported SharedComponents */

(function(exports) {

  var cachedTemplates = new Map();

  var getTemplate = function(id) {
    if (!cachedTemplates.has(id)) {
      cachedTemplates.set(id, Template(id));
    }
    return cachedTemplates.get(id);
  };

  var SharedComponents = {
    phoneDetails: function(details, interpolationOptions) {
      if (!details) {
        throw new Error('Phone details are required!');
      }

      return getTemplate('phone-details-tmpl').prepare({
        type: details.type,
        number: details.number,
        carrier: details.carrier,
        hasTypeClass: !!details.type ? 'has-phone-type' : '',
        hasCarrierClass: !!details.carrier ? 'has-phone-carrier' : ''
      }, interpolationOptions);
    }
  };

  exports.SharedComponents = SharedComponents;
})(window);
