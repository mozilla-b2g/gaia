define(function(require) {
  'use strict';

  function OperatorItemTemplate(onItemClick, operatorItem, recycled) {
    /**
     * A network list item has the following HTML structure:
     *   <li>
     *     <a>
     *       <span>Network Name</span>
     *       <small>Network Info</small>
     *     </a>
     *   </li>
     */

    var container = null;
    var name;
    var info;
    var link;

    if (recycled) {
      container = recycled;
      name = container.querySelector('span');
      info = container.querySelector('small');
      link = container.querySelector('a');
    } else {
      name = document.createElement('span');
      info = document.createElement('small');
      link = document.createElement('a');
      container = document.createElement('li');

      link.appendChild(name);
      link.appendChild(info);
      container.appendChild(link);
      container.classList.add('operatorItem');
    }

    name.textContent = operatorItem.name;
    operatorItem.observe('info', function() {
      info.setAttribute('data-l10n-id', 'operator-info-' + operatorItem.info);  
    });
    info.setAttribute('data-l10n-id', 'operator-info-' + operatorItem.info);

    if (typeof onItemClick === 'function') {
      container.onclick = function() {
        onItemClick(operatorItem);
      };
    }
    return container;
  }

  return function OperatorItemTemplateFactory(onItemClick) {
    return OperatorItemTemplate.bind(null, onItemClick);
  };
});
