'use strict';

/* global Template */

require('/shared/js/template.js');

suite('Template', function() {

  suite('extracted template strings', function() {

    var domElement;
    suiteSetup(function() {
      domElement = document.createElement('div');
      domElement.id = 'existing-id';
      domElement.appendChild(document.createComment('testing'));
      document.body.appendChild(domElement);
    });

    suiteTeardown(function() {
      if (domElement && domElement.parentNode) {
        document.body.removeChild(domElement);
        domElement = null;
      }
    });

    test('extract(node)', function() {
      var node = document.createElement('div');
      var comment = document.createComment('<span>${str}</span>');

      node.appendChild(document.createTextNode('  '));
      node.appendChild(comment);

      assert.equal(
        Template(node).toString(), '<span>${str}</span>'
      );

      node.textContent = '';
      assert.equal(
        Template(node).toString(), ''
      );
    });

    test('extract(null)', function() {
      assert.equal(Template(null), '');
    });

    test('extract(non-element)', function() {
      assert.equal(Template(document), '');
      assert.equal(Template(window), '');
      assert.equal(Template(document.createComment('')), '');
    });

    test('extract("non-existing-id")', function() {
      assert.equal(Template('non-existing-id'), '');
    });

    test('extract("existing-id")', function() {
      assert.equal(Template('existing-id').toString(), 'testing');
    });
  });

  suite('interpolate', function() {
    var html = document.createElement('div');
    var css = document.createElement('div');
    html.appendChild(document.createComment('<span>${str}</span>'));
    css.appendChild(document.createComment('#foo { height: ${height}px; }'));

    test('interpolate(data) => html', function() {
      var tmpl = Template(html);
      var interpolated = tmpl.interpolate({
        str: 'test'
      });
      assert.equal(typeof interpolated, 'string');
      assert.equal(interpolated, '<span>test</span>');
    });

    test('interpolate(data) => css', function() {
      var tmpl = Template(css);
      var interpolated = tmpl.interpolate({
        height: '100'
      });
      assert.equal(typeof interpolated, 'string');
      assert.equal(interpolated, '#foo { height: 100px; }');
    });
  });

  suite('interpolate: escape', function() {
    var node = document.createElement('div');
    node.appendChild(document.createComment('${str}'));

    test('escape: & => &amp;', function() {
      var tmpl = Template(node);
      var interpolated = tmpl.interpolate({
        str: '&'
      });
      assert.equal(interpolated, '&amp;');
    });

    test('escape: < => &lt;', function() {
      var tmpl = Template(node);
      var interpolated = tmpl.interpolate({
        str: '<'
      });
      assert.equal(interpolated, '&lt;');
    });

    test('escape: > => &gt;', function() {
      var tmpl = Template(node);
      var interpolated = tmpl.interpolate({
        str: '>'
      });
      assert.equal(interpolated, '&gt;');
    });

    test('escape: / => &#x2F;', function() {
      var tmpl = Template(node);
      var interpolated = tmpl.interpolate({
        str: '/'
      });
      assert.equal(interpolated, '&#x2F;');
    });
  });

  suite('interpolate: sanitize', function() {
    test('HTML removal with escaping', function() {
      var node, interpolated;

      node = document.createElement('div');
      node.appendChild(document.createComment('${str}'));

      interpolated = Template(node).interpolate({
        str: '<textarea><p>George & Lenny</p>'
      });
      assert.equal(
        interpolated,
        '&lt;textarea&gt;&lt;p&gt;George &amp; Lenny&lt;&#x2F;p&gt;'
      );

      node = document.createElement('div');
      node.appendChild(document.createComment('<p>${str}</p>'));

      interpolated = Template(node).interpolate({
        str: '<textarea><div>George & Lenny</div>'
      });
      assert.equal(
        interpolated,
        '<p>&lt;textarea&gt;&lt;div&gt;George &amp; Lenny&lt;&#x2F;div&gt;</p>'
      );
    });

    test('HTML removal (script)', function() {
      var node = document.createElement('div');
      node.appendChild(document.createComment('${str}'));

      var interpolated = Template(node).interpolate({
        str: '<script>alert("hi!")' + '</script>'
      });
      assert.equal(
        interpolated,
        '&lt;script&gt;alert(&quot;hi!&quot;)&lt;&#x2F;script&gt;'
      );
    });

    test('HTML removal (any)', function() {
      var node = document.createElement('div');
      node.appendChild(document.createComment('${str}'));

      var interpolated = Template(node).interpolate({
        str: '<textarea><div>hi!</div>'
      });
      assert.equal(
        interpolated,
        '&lt;textarea&gt;&lt;div&gt;hi!&lt;&#x2F;div&gt;'
      );
    });

    test('HTML safe list', function() {
      var node = document.createElement('div');
      node.appendChild(document.createComment('${foo}${bar}'));

      var interpolated = Template(node).interpolate({
        foo: '<script>alert("hi!")' + '</script>',
        bar: '<p>this is ok</p>'
      }, { safe: ['bar'] });
      assert.equal(
        interpolated,
        '&lt;script&gt;alert(&quot;hi!&quot;)' +
        '&lt;&#x2F;script&gt;<p>this is ok</p>'
      );
    });
  });

  suite('prepare', function() {
    var htmlTemplate, cssTemplate;

    setup(function() {
      var html = document.createElement('div');
      var css = document.createElement('div');

      html.appendChild(document.createComment('<span>${str}</span>'));
      css.appendChild(document.createComment('#foo { height: ${height}px; }'));

      htmlTemplate = Template(html);
      cssTemplate = Template(css);
    });

    test('prepare(data).toString => html', function() {
      var interpolated = htmlTemplate.prepare({
        str: 'test'
      }).toString();
      assert.equal(typeof interpolated, 'string');
      assert.equal(interpolated, '<span>test</span>');
    });

    test('prepare(data).toString => css', function() {
      var interpolated = cssTemplate.prepare({
        height: '100'
      }).toString();
      assert.equal(typeof interpolated, 'string');
      assert.equal(interpolated, '#foo { height: 100px; }');
    });

    test('prepare(data).toDocumentFragment => html', function() {
      var interpolated = htmlTemplate.prepare({
        str: 'test'
      }).toDocumentFragment();
      assert.instanceOf(interpolated, DocumentFragment);
      assert.equal(interpolated.children.length, 1);
      assert.equal(interpolated.querySelector('span').textContent, 'test');
    });

    test('prepare(data).toDocumentFragment => css', function() {
      var interpolated = cssTemplate.prepare({
        height: '100'
      }).toDocumentFragment();
      assert.instanceOf(interpolated, DocumentFragment);
      assert.equal(interpolated.childNodes.length, 1);
      assert.equal(interpolated.firstChild.nodeType, Node.TEXT_NODE);
      assert.equal(
        interpolated.firstChild.textContent,
        '#foo { height: 100px; }'
      );
    });

    test('prepare.toDocumentFragment returns clone on every call', function() {
      var interpolated = htmlTemplate.prepare({
        str: 'test'
      });

      var documentFragments = new Set();

      for (var i = 0; i < 5; i++) {
        documentFragments.add(interpolated.toDocumentFragment());
      }

      // Verify that all document fragments aren't equal, so Set should have
      // separate entry for every new fragment
      assert.equal(documentFragments.size, 5);

      documentFragments.forEach(function(fragment) {
        assert.instanceOf(fragment, DocumentFragment);
        assert.equal(fragment.children.length, 1);
        assert.equal(fragment.querySelector('span').textContent, 'test');
      });
    });
  });

  suite('Template.escape', function() {

    test('valid', function() {
      var fixture = '<div>"Hello!"&  \' </div>';

      assert.equal(
        Template.escape(fixture),
        '&lt;div&gt;&quot;Hello!&quot;&amp;  &apos; &lt;&#x2F;div&gt;'
      );
    });

    test('invalid', function() {
      var expect = '';

      assert.equal(Template.escape(0), expect);
      assert.equal(Template.escape(false), expect);
      assert.equal(Template.escape(true), expect);
      assert.equal(Template.escape(null), expect);
      assert.equal(Template.escape({}), expect);
      assert.equal(Template.escape([]), expect);
    });
  });
});
