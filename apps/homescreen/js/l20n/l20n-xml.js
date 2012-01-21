document.addEventListener("DOMContentLoaded", function() {
  var headNode = document.getElementsByTagName('head')[0];

  if (!headNode)
    return;

  var ctx = L20n.getContext();

  var links = headNode.getElementsByTagName('link')
  for (var i = 0; i < links.length; i++) {
    if (links[i].getAttribute('type') == 'intl/l20n')
      ctx.addResource(links[i].getAttribute('href'))
  }

  var scriptNodes = headNode.getElementsByTagName('script')
  for (var i=0;i<scriptNodes.length;i++) {
    if (scriptNodes[i].getAttribute('type')=='application/l20n') {
      var contextData = JSON.parse(scriptNodes[i].textContent);
      ctx.data = contextData;
    }
  }

  ctx.onReady = function() {
    var nodes = document.querySelectorAll('[l10n-id]');
    for (var i = 0, node; node = nodes[i]; i++) {
      localizeNode(ctx, node);
    }
  }

  HTMLElement.prototype.retranslate = function() {
    if (this.hasAttribute('l10n-id')) {
      localizeNode(ctx, this);
      return;
    }
    throw Exception("Node not localizable");
  }

  HTMLElement.prototype.__defineGetter__('l10nData', function() {
    return this.nodeData;
  });

  HTMLDocument.prototype.__defineGetter__('l10nData', function() {
    return ctx.data;
  });

  HTMLDocument.prototype.__defineGetter__('l10nCtx', function() {
    return ctx;
  });

  ctx.freeze();
});

function getPathTo(element, context) {
  const TYPE_ELEMENT = 1;

  if (element === context)
    return '.';

  var id = element.getAttribute('id');
  if (id)
    return '*[@id="' + id + '"]';

  var index = 0;
  var siblings = element.parentNode.childNodes;
  for (var i = 0, sibling; sibling = siblings[i]; i++) {
    if (sibling === element) {
      var pathToParent = getPathTo(element.parentNode, context);
      return pathToParent + '/' + element.tagName + '[' + (index + 1) + ']';
    }
    if (sibling.nodeType === TYPE_ELEMENT && sibling.tagName === element.tagName)
      index++;
  }
}

function getElementByPath(path, context) {
  var xpe = document.evaluate(path, context, null,
    XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return xpe.singleNodeValue;
}

function localizeNode(ctx, node) {
  var l10nId = node.getAttribute('l10n-id');
  var args;

  // node.nodeData must not be exposed
  if (node.nodeData) {
    args = node.nodeData;
  } else if (node.hasAttribute('l10n-args')) {
    args = JSON.parse(node.getAttribute('l10n-args'));
    node.nodeData = args;
  }
  // get attributes from the LO
  var attrs = ctx.getAttributes(l10nId, args);
  var l10nAttrs;
  if (node.hasAttribute('l10n-attrs'))
    l10nAttrs = node.getAttribute('l10n-attrs').split(" ");
  else
    l10nAttrs = null;
  if (attrs) {
    for (var j in attrs) {
      if (!l10nAttrs || l10nAttrs.indexOf(j) !== -1)
        node.setAttribute(j, attrs[j]);
    }
  }
  var valueFromCtx = ctx.get(l10nId, args);
  if (valueFromCtx === null)
    return;

  // deep-copy the original node
  var origNode = node.cloneNode(true);
  node.innerHTML = valueFromCtx;

  // overlay the attributes of descendant nodes
  var children = node.getElementsByTagName('*');
  for (var i = 0, child; child = children[i]; i++) {
    // Match the child node with the equivalent node in origNode.
    // The tricky part is that the node in origNode might have been 
    // translated before; if so and if it had been reordered via 
    // `l10n-path`, it's likely that even though the path points to it, it 
    // actually _isn't_ the right node.
    var path = child.getAttribute('l10n-path');
    if (!path) {
      path = getPathTo(child, node);
    }
    var origChild = getElementByPath(path, origNode);
    // If the origChild already has `l10n-path`, it's likely that it has
    // already been translated once.  Follow its `l10n-path` again to find 
    // the true source equivalent in origNode.
    var origChildPath = origChild && origChild.getAttribute('l10n-path');
    if (origChildPath) {
      origChild = getElementByPath(origChildPath, origNode);
    }
    if (!origChild) {
      continue;
    }

    for (var k = 0, origAttr; origAttr = origChild.attributes[k]; k++) {
      if (!child.hasAttribute(origAttr.name)) {
        child.setAttribute(origAttr.nodeName, origAttr.value);
      }
    }
  }
}
// vim: ts=2 et sw=2 sts=2
