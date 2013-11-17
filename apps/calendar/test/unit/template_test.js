requireLib('format.js');
requireLib('template.js');

suite('calendar/template', function() {
  var Template, subject,
      tplStr = '%s foo %h',
      support;


  suiteSetup(function() {
    support = testSupport.calendar;
  });

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
    var tpl,
        result,
        objects;

    objects = [
      { x: 1, y: 2 },
      { x: 7, y: 7 }
    ];

    tpl = new Template(function() { return this.h('x') + 'x' + this.h('y'); });
    result = tpl.renderEach(objects);

    assert.deepEqual(result, [
      '1x2',
      '7x7'
    ], 'should return array of rendered results');

    result = tpl.renderEach(objects, '--');

    assert.equal(
      result,
      '1x2--7x7',
      'should return string joined by ","'
    );
  });

  suite('#render', function() {

    test('single placeholder no flag', function() {
      var tpl = new Template(function() {
        return 'z ' + this.h('a') + ' foo';
      });

      assert.equal(tpl.render({a: 'baz'}), 'z baz foo');
      assert.equal(tpl.render({a: 'baz'}), 'z baz foo');
      assert.equal(tpl.render({a: 'baz'}), 'z baz foo');
    });

    test('when input is not an object', function() {
      var tpl = new Template(function() {
          return 'foo ' + this.h('value') + '!'; });
      var result = tpl.render(1);

      assert.equal(result, 'foo 1!');
    });

    test('without placeholders', function() {
      var tpl = new Template(function() { return 'foo bar'; });
      assert.equal(tpl.render(), 'foo bar');
    });

    test('multiple placeholders', function() {
      var tpl = new Template(function() {
        return this.h('2') + ' ! ' + this.h('1');
      });
      assert.equal(tpl.render({1: '1', 2: '2'}), '2 ! 1');
    });

    test('keys with dashes', function() {
      var tpl = new Template(function() {
        return this.h('foo-bar');
      });

      assert.equal(tpl.render({'foo-bar': 'fo'}), 'fo');
    });

    test('html escape', function() {
      var tpl, input, output;

      tpl = new Template(function() {
        return this.h('html');
      });

      input = '<div class="foo">\'zomg\'</div>';
      output = tpl.render({html: input});

      assert.equal(
        output,
        '&lt;div class=&quot;foo&quot;&gt;&#x27;zomg&#x27;&lt;/div&gt;'
      );

      assert.equal(
        tpl.render({}),
        ''
      );
    });

    test('without arguments', function() {
      var tpl = new Template(function() { return 'foo ' + this.h('value'); });
      assert.equal(tpl.render(), 'foo ');
    });

    test('with newlines in tpl', function() {
      var tpl = new Template(function() { return '\nfoo ' + this.h('value'); });
      assert.equal(tpl.render('bar'), '\nfoo bar');
    });

    test('no html escape', function() {
      var tpl, input, output;

      tpl = new Template(function() {
        return this.s('html');
      });

      input = '<div class="foo">\'zomg\'</div>';
      output = tpl.render({html: input});

      assert.equal(
        output,
        input
      );
    });

    test('bool handler', function() {
      var tpl, input, output;
      tpl = new Template(function() { return this.bool('one', 'selected'); });
      output = tpl.render({ one: true });
      assert.equal(output, 'selected');

      output = tpl.render({ one: false });
      assert.equal(output, '');
    });

    suite('l10n', function() {
      var realL10n;
      var lookup = {
        foo: 'FOO',
        bar: 'BAR',
        'field-one': 'first'
      };

      suiteSetup(function() {
        realL10n = navigator.mozL10n;
        navigator.mozL10n = {
          get: function(name) {
            return lookup[name];
          }
        };
      });

      suiteTeardown(function() {
        if (realL10n) {
          navigator.mozL10n = realL10n;
        }
      });

      test('prefix', function() {
        var tpl = new Template(function() {
          return this.l10n('start', 'field-') + ' foo';
        });

        var result = tpl.render({
          'start': 'one'
        });

        assert.equal(result, 'first foo');
      });

      test('simple', function() {
        var tpl = new Template(function() {
          return this.l10n('one') + ' ' + this.l10n('two');
        });

        var result = tpl.render({
          one: 'foo',
          two: 'bar'
        });

        assert.equal(result, 'FOO BAR');
      });
    });

  });

  suite('benchmarks', function() {

    test('tpl vs format', function() {
      // XXX: Minor performance regression
      // come back later and inline
      // modifiers which should make
      // templates quite a bit faster
      return;

      var tpl = 'My name is {first} {last}, Thats Mr {last}';
      var template;

      var expected = 'My name is Sahaja Lal, Thats Mr Lal';

      var results = support.vs(5000, {
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

      var results = support.vs(5000, {
        html: function() {
          var myDiv = div.cloneNode(true),
              mySpan = myDiv.querySelector('span');

          myDiv.className = 'dynamic';
          mySpan.textContent = 'content';
          mySpan.className = 'foo';

          container.innerHTML = '';
          container.appendChild(myDiv);
        },

        template: function() {
          tpl = tpl || new Template(function() {
            return '<div class="' + this.h('divClass') + '">' +
              '<span class="' + this.h('spanClass') + '">' +
                this.h('content') + '</span>' +
            '</div>';
          });
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

