define(function(require) {
  'use strict';

  var CertificateTemplate = function(name, onClick) {
    if (!name || !onClick) {
      throw new Error('Please double check your parameters');
    }

    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#';
    a.classList.add('menu-item');
    a.onclick = onClick;

    var span = document.createElement('span');
    span.textContent = name;

    a.appendChild(span);
    li.appendChild(a);

    return li;
  };
  
  return function ctor_certificateTemplate(name, onClick) {
    return CertificateTemplate(name, onClick);
  };
});
