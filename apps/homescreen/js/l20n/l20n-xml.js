document.addEventListener("DOMContentLoaded", function() {
  if (!l20nlib)
    var l20nlib = "custom"; // system || custom


  if (l20nlib == "system") {
    Components.utils.import("resource://gre/modules/L20n.jsm");
  }



  var ctx = L20n.getContext();

  var headNode = null;
  var headNodes = document.getElementsByTagName('head');
  if (headNodes)
    headNode = headNodes[0];

  if (headNode == null)
    return;

  var linkNodes = headNode.getElementsByTagName('link')
  for (var i=0;i<linkNodes.length;i++) {
    if (linkNodes[i].getAttribute('type')=='intl/l20n')
      ctx.addResource(linkNodes[i].getAttribute('href'))
  }

  var scriptNodes = headNode.getElementsByTagName('script')
  for (var i=0;i<scriptNodes.length;i++) {
    if (scriptNodes[i].getAttribute('type')=='application/l20n') {
      var contextData = JSON.parse(scriptNodes[i].textContent);
      ctx.data = contextData;
    }
  }

  ctx.onReady = function() {
    var nodes = document.body.getElementsByTagName('*');
    for (var i=0, node; node = nodes[i]; i++) {
      localizeNode(ctx, node);
    }
  }

  HTMLElement.prototype.retranslate = function() {
    localizeNode(ctx, this);
  }

  HTMLElement.prototype.__defineGetter__('l10nData', function() {
    return this.nodeData;
  });

  HTMLDocument.prototype.__defineGetter__('l10nData', function() {
    return ctx.data;
  });

  ctx.freeze();
}, false);

function getPathTo(element, context) {
  if (element === context) {
    return '.';
  }
  var id = element.getAttribute('id');
  if (id) {
    return '*[@id="' + id + '"]';
  }
  var localPath = element.getAttribute('l10n-path');
  if (localPath) {
    return element.getAttribute('l10n-path');
  }

  var ix = 0;
  var siblings = element.parentNode.childNodes;
  for (var i=0, sibling; sibling = siblings[i]; i++) {
    if (sibling === element) {
      var pathToParent = getPathTo(element.parentNode, context);
      return pathToParent + '/' + element.tagName + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

function getElementByPath(path, context) {
  var xpe = document.evaluate(path, context, null,
    XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return xpe.singleNodeValue;
}


function localizeNode(ctx, node) {
  var l10nId;
  if (l10nId = node.getAttribute('l10n-id')) {
    var args;
    // node.nodeData 
    // must not be exposed
    if (node.nodeData) {
      args = node.nodeData;
    } else if (node.hasAttribute('l10n-args')) {
      args = JSON.parse(node.getAttribute('l10n-args'));
      node.nodeData = args;
    }
    // get attributes from the LO
    var attrs = ctx.getAttributes(l10nId, args);
    if (attrs) {
      for (var j in attrs) {
        node.setAttribute(j, attrs[j]);
      }
    }
    var valueFromCtx = ctx.get(l10nId, args);
    if (valueFromCtx === null) {
      return;
    }
    // deep-copy the original node
    var origNode = node.cloneNode(true);
    node.innerHTML = valueFromCtx;
    // overlay the attributes of descendant nodes
    var children = node.getElementsByTagName('*');
    for (var j=0, child; child = children[j]; j++) {
      var path = child.getAttribute('l10n-path');
      if ( ! path) {
        path = getPathTo(child, node);
      }
      // match the child node with the equivalent node in origNode
      var origChild = getElementByPath(path, origNode);
      if ( ! origChild) {
        continue;
      }
      for (var k=0, origAttr; origAttr = origChild.attributes[k]; k++) {
        // if ( ! origAttr.specified) continue;  // for IE?
        if ( ! child.hasAttribute(origAttr.name)) {
          child.setAttribute(origAttr.nodeName, origAttr.value);
        }
      }
    }
  }
}
// vim: tw=2 et sw=2 sts=2
