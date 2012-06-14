requireApp('calendar/js/format.js');
requireApp('calendar/js/template.js');

suite('calendar/template', function() {
  var Template, subject,
      tplStr = '%s foo %h';

  suiteSetup(function() {
    Template = Calendar.Template;
  });

  suite('Template.create', function() {
    var result;

    setup(function() {
      result = Template.create({
        a: 'a',
        b: 'b'
      });
    });

    test('result', function() {
      assert.instanceOf(result.a, Template, 'should create template for a');
      assert.instanceOf(result.b, Template, 'should create template for b');
    });

  });

  setup(function() {
    subject = new Template(tplStr);
  });

  suite('initialization', function() {
    test('should set .template', function() {
      assert.equal(subject.template, tplStr);
    });
  });

  test('#renderEach', function() {
    var tpl = new Template('{x}x{y}');
    var result = tpl.renderEach([
      { x: 1, y: 2 },
      { x: 7, y: 7 }
    ]);

    assert.deepEqual(result, [
      '1x2',
      '7x7'
    ]);
  });

  suite('#render', function() {

    function renderTests(method) {


      test('single placeholder no flag', function() {
        var tpl = new Template(
          'z {a} foo'
        );

        assert.equal(tpl[method]({a: 'baz'}), 'z baz foo');
        assert.equal(tpl[method]({a: 'baz'}), 'z baz foo');
        assert.equal(tpl[method]({a: 'baz'}), 'z baz foo');
      });

      test('when input is not an object', function() {
        var tpl = new Template('foo {value}!');
        var result = tpl.render(1);

        assert.equal(result, 'foo 1!');
      });

      test('without placeholders', function() {
        var tpl = new Template('foo bar');
        assert.equal(tpl.render(), 'foo bar');
      });

      test('multiple placeholders', function() {
        var tpl = new Template(
          '{2} ! {1}'
        );
        assert.equal(tpl[method]({1: '1', 2: '2'}), '2 ! 1');
      });

      test('keys with dashes', function() {
        var tpl = new Template(
          '{foo-bar}'
        );

        assert.equal(tpl.render({'foo-bar': 'fo'}), 'fo');
      });

      test('html escape', function() {
        var tpl, input, output;

        tpl = new Template(
          '{html}'
        );

        input = '<div class="foo">\'zomg\'</div>';
        output = tpl.render({html: input});

        assert.equal(
          output,
          '&lt;div class=&quot;foo&quot;&gt;&#x27;zomg&#x27;&lt;/div&gt;'
        );
      });

      test('without arguments', function() {
        var tpl = new Template('foo {value}');
        assert.equal(tpl.render(), 'foo ');
      });

      test('with newlines in tpl', function() {
        var tpl = new Template('\nfoo {value}');
        assert.equal(tpl.render('bar'), '\nfoo bar');
      });

      test('no html escape', function() {
        var tpl, input, output;

        tpl = new Template(
          '{html|s}'
        );

        input = '<div class="foo">\'zomg\'</div>';
        output = tpl.render({html: input});

        assert.equal(
          output,
          input
        );
      });

    }

    renderTests('render');

  });

  suite('benchmarks', function() {

    function bench(iter, cb) {
      var start = window.performance.now(),
          i = 0;

      for (; i < iter; i++) {
        cb();
      }

      return window.performance.now() - start;
    }

    function vs(iter, cmds) {
      var results = {},
          key;

      for (key in cmds) {
        if (cmds.hasOwnProperty(key)) {
          results[key] = bench(iter, cmds[key]);
        }
      }

      return results;
    }

    test('tpl vs format', function() {
      var tpl = 'My name is {first} {last}, Thats Mr {last}';
      var template;

      var expected = 'My name is Sahaja Lal, Thats Mr Lal';

      var results = vs(5000, {
        compiled: function() {
          template = template || new Template(tpl);
          template.render({first: 'Sahaja', last: 'Lal'});
        },

        format: function() {
          Calendar.format(tpl, 'Sahaja', 'Lal');
        }
      });

      assert.ok(
        (results.compiled <= results.format),
        'compiled template should be faster then format'
      );
    });

    test('createElement vs template', function() {
      var container = document.createElement('div'),
          tpl;

      container.id = 'containerTest';
      document.body.appendChild(container);

      var div = document.createElement('div'),
          span = document.createElement('span');

      div.appendChild(span);

      var results = vs(5000, {
        html: function() {
          var myDiv = div.cloneNode(),
              mySpan = myDiv.querySelector('span');

          myDiv.className = 'dynamic';
          mySpan.textContent = 'content';
          mySpan.className = 'foo';

          container.innerHTML = '';
          container.appendChild(myDiv);
        },

        template: function() {
          tpl = tpl || new Template(
            '<div class="{divClass}">' +
              '<span class="{spanClass}">{content}</span>' +
            '</div>'
          );
          container.innerHTML = '';
          container.innerHTML = tpl.render({
            divClass: 'dynamic',
            spanClass: 'foo',
            content: 'content'
          });
        }
      });

      container.parentNode.removeChild(container);
    });

  });

});

