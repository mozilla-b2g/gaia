(function(exports) {
'use strict';

const DEFAULT_TIMEOUT = 3000;

var template;
function createNotificationNode(contentL10n) {
  if (!template) {
    template = document.createElement('section');
    template.role = 'notification';
  }

  var notificationNode = template.cloneNode(true);
  notificationNode.appendChild(createLocalizedElement(contentL10n));
  return notificationNode;
}

function createLocalizedElement(valueL10n) {
  var element = document.createElement('p');
  // if we passed an l10nId, use the l10n 'setAttributes' method
  if (typeof valueL10n === 'string') {
    element.setAttribute('data-l10n-id', valueL10n);
  } else if (valueL10n.id) {
    navigator.mozL10n.setAttributes(element, valueL10n.id, valueL10n.args);
    // if we passed in a HTML Fragment, it is already localized
  } else if (valueL10n.raw && valueL10n.raw.nodeType) {
    element.appendChild(valueL10n.raw);
    // otherwise - stuff text in here...
  } else {
    element.textContent = valueL10n.raw;
  }
  return element;
}

exports.AppNotification = {
  create(contentL10n, options = {}) {
    var node, hideTimeout;

    function hide() {
      if (!node) {
        return;
      }

      node.remove();
      node = null;
    }

    function hideOnTimeout(timeout = DEFAULT_TIMEOUT) {
      if (!node) {
        return;
      }

      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }

      hideTimeout = setTimeout(hide, timeout);
    }

    function show() {
      if (node) {
        // Cancel auto-hide if we changed mind and want notification to stay.
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = 0;
        }

        return;
      }

      node = createNotificationNode(contentL10n);
      document.querySelector('.app-notification-container').appendChild(node);

      if (!options.persistent) {
        hideOnTimeout(options.timeout);
      }
    }

    return { show, hide, hideOnTimeout };
  }
};
})(window);
