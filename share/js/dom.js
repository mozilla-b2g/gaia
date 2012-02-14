'use strict';

function $(id) { return document.getElementById(id); }

function elt(tag, attrs, kids) {
  var e = document.createElement(tag);
  if (attrs) {
    for (var a in attrs)
      e.setAttribute(a, attrs[a]);
  }

  if (kids) {
    if (typeof kids === 'string') {
      e.appendChild(document.createTextNode(kids));
    }
    else if (Array.isArray(kids)) {
      kids.forEach(function(k) {
        if (typeof k === 'string')
          e.appendChild(document.createTextNode(k));
        else
          e.appendChild(k);
      });
    }
    else {
      e.appendChild(kids);
    }
  }

  return e;
}
