define(['l10n!'], function(mozL10n) {
  // Keep track of all translated nodes, so that they are properly
  // updated on the fly when the language changes.
  var nodes = [];
  mozL10n.ready(function() {
    nodes.forEach(function(node) {
      mozL10n.translate(node);
    });
  });

  var tmpl = {
    pluginBuilder: './tmpl_builder',

    toDom: function(text) {
        var temp = document.createElement('div');
        temp.innerHTML = text;
        var node = temp.children[0];
        mozL10n.translate(node);
        return node;
    },

    load: function(id, require, onload, config) {
      require(['text!' + id], function(text) {
        var node = tmpl.toDom(text);
        nodes.push(node);
        onload(node);
      });
    }
  };

  return tmpl;
});
