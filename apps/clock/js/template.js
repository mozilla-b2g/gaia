define(function(require) {
'use strict';
var Template = require('shared/js/template');

function ClockTemplate(text) {
  var srcNode = document.createElement('div');
  var comment = document.createComment(text);
  srcNode.appendChild(comment);
  return new Template(srcNode);
}

return ClockTemplate;
});
