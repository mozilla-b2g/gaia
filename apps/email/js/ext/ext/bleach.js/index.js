// for node, require jsdom bindings, and pass it in as the document constructor
var jsdom = require('jsdom');
module.exports = require('./lib/bleach.js');
module.exports.documentConstructor = jsdom.jsdom;
module.exports._preCleanNodeHack = function(node, html) {
  // workaround for jsdom comment bug
  if (node.innerHTML === '' && html.match(/<!--/)) {
    node.innerHTML = (html + '-->');
  }
};
