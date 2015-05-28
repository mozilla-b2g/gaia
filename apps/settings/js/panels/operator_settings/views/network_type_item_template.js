define(function(require) {
  'use strict';

  function Template(networkTypeMap, networkType, recycled) {
    /**
     * A network list item has the following HTML structure:
     *   <option>
     *     Network Type
     *   </option>
     */

    var container = null;
    if (recycled) {
      container = recycled;
    } else {
      container = document.createElement('option');
    }

    container.value = networkType;
    var textInfo = networkTypeMap(networkType);
    if (textInfo.l10nId) {
      container.setAttribute('data-l10n-id', textInfo.l10nId);
    } else if (textInfo.text) {
      container.textContent = textInfo.text;
    } else {
      container.textContent = networkType;
    }

    return container;
  }

  return function TemplateFactory(networkTypeMap) {
    return Template.bind(null, networkTypeMap);
  };
});
