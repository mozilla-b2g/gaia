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
        '&lt;textarea&gt;&lt;p&gt;George &amp; Lenny&lt;/p&gt;'
      );

      node = document.createElement('div');
      node.appendChild(document.createComment('<p>${str}</p>'));

      interpolated = Template(node).interpolate({
        str: '<textarea><div>George & Lenny</div>'
      });
      assert.equal(
        interpolated,
        '<p>&lt;textarea&gt;&lt;div&gt;George &amp; Lenny&lt;/div&gt;</p>'
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
        '&lt;script&gt;alert(&quot;hi!&quot;)&lt;/script&gt;'
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
        '&lt;textarea&gt;&lt;div&gt;hi!&lt;/div&gt;'
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
        '&lt;script&gt;alert(&quot;hi!&quot;)&lt;/script&gt;<p>this is ok</p>'
      );
    });
  });

  suite('Template.escape', function() {

    test('valid', function() {
      var fixture = '<div>"Hello!"&  \' </div>';

      assert.equal(
        Template.escape(fixture),
        '&lt;div&gt;&quot;Hello!&quot;&amp;  &apos; &lt;/div&gt;'
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
