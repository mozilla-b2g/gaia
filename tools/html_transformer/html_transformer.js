var Promise = require('es6-promise').Promise;
var jsdom = require('jsdom');

exports.load = function(filename) {
  return new Promise(function(resolve, reject) {
    jsdom.env(filename, function(errors, window) {
      if (errors && errors.length) {
        return reject(errors[0]);
      }

      return resolve(new HTMLTransformer(window));
    });
  });
};

function HTMLTransformer(window) {
  this.window = window;
}
exports.HTMLTransformer = HTMLTransformer;

HTMLTransformer.prototype = {
  getSharedDependencies: function() {
    var doc = this.window.document;
    var links = getSharedElements(doc, 'link');
    var scripts = getSharedElements(doc, 'script');
    var commented = flatmap(getComments(doc), getSharedElementsFromComment);
    return links.concat(scripts).concat(commented);
  }
};

function getSharedElements(doc, selector) {
  return querySelectorAll(doc, selector).map(getShared).filter(function(x) {
    return !!x;
  });
}

function getSharedElementsFromComment(comment) {
  var sharedLink = /<link\s.*href="(app:\/\/.+\.gaiamobile\.org)?\/?(shared\/.+)".*>/;
  var sharedScript = /<script\s.*src="(app:\/\/.+\.gaiamobile\.org)?\/?(shared\/.+)".*>/;

  return flatmap(comment.split(/\n/), function(commentLine) {
    var links = commentLine.match(sharedLink) || [];
    var scripts = commentLine.match(sharedScript) || [];
    var results = links.concat(scripts);
    return results.filter(function(result) {
      return result && result.indexOf('shared') === 0;
    });
  });
};

// Neither document.createTreeWalker nor document.createNodeIterator
// are supported by jsdom so we're going to do this the old fashioned way...
function getComments(doc) {
  var results = [];
  var queue = [doc.body];
  while (queue.length) {
    var next = queue.shift();
    if (next.nodeType === 8 /* COMMENT_NODE */) {
      results.push(next.textContent);
    }

    var children = next.childNodes;
    if (children && children.length) {
      for (var i = 0; i < children.length; i++) {
        queue.push(children[i]);
      }
    }
  }

  return results;
}

function querySelectorAll(doc, selector) {
  return Array.prototype.slice.call(doc.querySelectorAll(selector));
}

function getShared(node) {
  var sharedUrl = /^(app:\/\/.+\.gaiamobile\.org)?\/?(shared\/.+)/;
  var match;
  switch (node.nodeName) {
    case 'LINK':
      match = node.href.match(sharedUrl);
      break;
    case 'SCRIPT':
      match = node.src.match(sharedUrl);
      break;
    default:
      return false;
  }

  return (match && match.length) ? match.filter(function(str) {
    return str && str.indexOf('shared') === 0;
  })[0] : false;
}

function flatmap(array, fn) {
  var result = [];
  array.map(fn).forEach(function(subresult) {
    if (Array.isArray(subresult)) {
      result = result.concat(subresult);
    }
  });

  return result;
}
