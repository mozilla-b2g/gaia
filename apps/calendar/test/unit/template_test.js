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

  suite('#render', function() {

    function renderTests(method) {


      test('single placeholder', function() {
        var tpl = new Template(
          'z %s foo'
        );

        assert.equal(tpl[method]('baz'), 'z baz foo');
        assert.equal(tpl[method]('baz'), 'z baz foo');
        assert.equal(tpl[method]('baz'), 'z baz foo');
      });

      test('without placeholders', function() {
        var tpl = new Template('foo bar');
        assert.equal(tpl.render(), 'foo bar');
      });

      test('multiple placeholders', function() {
        var tpl = new Template(
          '%s ! %s'
        );
        assert.equal(tpl[method]('1', '2'), '1 ! 2');
      });

      test('fixed positions', function() {
        var tpl = new Template(
          '%0s %s %0s %1s %s %s %2s %0s %1s'
        );
        var result = tpl[method](
          'foo', 'bar', 'baz'
        );

        assert.equal(
          result,
          'foo foo foo bar bar baz baz foo bar'
        );
      });

      test('html escape', function() {
        var tpl, input, output;

        tpl = new Template(
          '%h'
        );

        input = '<div class="foo">\'zomg\'</div>';
        output = tpl.render(input);

        assert.equal(
          output,
          '&lt;div class=&quot;foo&quot;&gt;&#x27;zomg&#x27;&lt;/div&gt;'
        );
      });
    }

    renderTests('render');

  });

  suite('benchmarks', function() {

    function bench(iter, cb) {
      var start = Date.now(),
          i = 0;

      for (; i < iter; i++) {
        cb();
      }

      return Date.now() - start;
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

    test('tpl vs format - 20000', function() {
      var tpl = 'My name is %s %s, Thats Mr %1s';
      var template;

      var expected = 'My name is Sahaja Lal, Thats Mr Lal';

      var results = vs(5000, {
        compiled: function() {
          template = template || new Template(tpl);
          template.render('Sahaja', 'Lal');
        },

        format: function() {
          Calendar.format(tpl, 'Sahaja', 'Lal');
        }
      });

      assert.ok(
        (results.compiled < results.format),
        'compiled template should be faster then format'
      );
    });

    test('html vs innerHTML', function() {
      var container = document.createElement('div');
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

          container.innerHTML = '<span></span>';
          container.appendChild(myDiv);
        },

        template: function() {
          container.innerHTML = '<div class="dynamic"><span>content</span></div>';
        }
      });

      container.parentNode.removeChild(container);
    });


    test('createElement vs template', function() {
      var container = document.createElement('div'),
          tpl;

      container.id = 'containerTest';
      document.body.appendChild(container);

      var div = document.createElement('div'),
          span = document.createElement('span');

      div.appendChild(span);

      var results = vs(10000, {
        html: function() {
          var myDiv = div.cloneNode(),
              mySpan = myDiv.querySelector('span');

          myDiv.className = 'dynamic';
          mySpan.textContent = 'content';
          mySpan.className = 'foo';

          container.innerHTML = '<span></span>';
          container.appendChild(myDiv);
        },

        template: function() {
          tpl = tpl || new Template(
            '<div class="%h"><span class="%h">%h</span></div>'
          );
          container.innerHTML = '<span></span>';
          container.innerHTML = tpl.render('dynamic', 'foo', 'content');
        }
      });

      console.log(results);

      container.parentNode.removeChild(container);
    });

  });

});

