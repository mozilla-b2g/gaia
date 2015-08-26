'use strict';

var strings = {
 'lang1': [
   'text-em = Hello, <em title="WORLD">world</em>!',
   'text-em-sup = Hello, <em title="WORLD">world</em><sup>(foo)</sup>!',
   'text-entity-name = Hello &amp; world',
   'text-entity-nnnn = Hello &#0038; world',
   'text-entity-hhhh = Hello &#x0026; world',

   'struct-a = Read <a title="MORE">more</a>.',
   'struct-em-a = <em>Read</em> <a>more</a>.',
   'struct-a-a = Read <a>more</a> or <a>cancel</a>.',
   'struct-button = <button>Submit</button>',
   'struct-button-a = <button>Submit</button> or <a>cancel</a>.',
   'struct-a-button = <a>Cancel</a> or <button>submit</button>.',
   'struct-input-input = <input placeholder="Type here"> and ' +
     '<input value="send">.',

   'filter-button = Hello, <button title="WORLD">world</button>!',
   'filter-em-onclick = Hello, <em onclick="alert(2)">world</em>!',
   'filter-button-onclick = Hello, <button onclick="alert(2)">world</button>!',
   'filter-href = Read <a href="#B">more</a>.',
   'filter-input-value = <input value="Other value">',
   'filter-input-type = <input type="submit" value="Submit"> the form.',
   'filter-nested-button = <em>No <button>button</button>.</em>',
  ],
 'lang2': [
    'struct-a = Czytaj <a>więcej</a>.'
  ]
};

suite('L10n DOM overlays', function() {
  var xhr;
  var lang;

  // Do not begin tests until the test locale has been loaded.
  suiteSetup(function(done) {
    xhr = sinon.useFakeXMLHttpRequest();

    xhr.onCreate = function(request) {
      setTimeout(function() {
        request.respond(200, {}, strings[lang].join('\n'));
      }, 0);
    };

    // en-US has already been loaded in setup.js and l10n.js is smart enough
    // not to re-fetch resources;  hence, set the lang to something new
    lang = 'lang1';

    navigator.mozL10n.ctx.registerLocales('en-US', ['lang1', 'lang2']);

    navigator.mozL10n.language.code = lang;
    navigator.mozL10n.once(done);
  });

  suiteTeardown(function() {
    xhr.restore();
  });

  suite('text-level semantics', function() {
    var elem;

    setup(function() {
      elem = document.createElement('div');
    });

    test('em is allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'text-em');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.innerHTML, 'Hello, <em title="WORLD">world</em>!');
    });

    test('em and sup are both allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'text-em-sup');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML, 'Hello, <em title="WORLD">world</em><sup>(foo)</sup>!');
    });

    test('entity name is allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'text-entity-name');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.innerHTML, 'Hello &amp; world');
    });

    test('entity decimal codepoint is allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'text-entity-nnnn');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.innerHTML, 'Hello &amp; world');
    });

    test('entity hexadecimal codepoint is allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'text-entity-hhhh');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.innerHTML, 'Hello &amp; world');
    });

  });

  suite('structural overlay', function() {
    var elem;

    setup(function() {
      elem = document.createElement('div');
    });

    test('href is overlaid', function() {
      elem.innerHTML = '<a href="#A" title="TITLE">A</a>';
      navigator.mozL10n.setAttributes(elem, 'struct-a');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        'Read <a href="#A" title="MORE">more</a>.');
    });

    test('href is overlaid onto a', function() {
      elem.innerHTML = '<a href="#A" title="TITLE">A</a>';
      navigator.mozL10n.setAttributes(elem, 'struct-em-a');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<em>Read</em> <a href="#A" title="TITLE">more</a>.');
    });

    test('hrefs are overlaid onto two a\'s', function() {
      elem.innerHTML = '<a href="#A">A</a> <a href="#B">B</a>';
      navigator.mozL10n.setAttributes(elem, 'struct-a-a');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        'Read <a href="#A">more</a> or <a href="#B">cancel</a>.');
    });

    test('button is overlaid', function() {
      elem.innerHTML = '<button onclick="alert(1)">BUTTON</button>';
      navigator.mozL10n.setAttributes(elem, 'struct-button');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<button onclick="alert(1)">Submit</button>');
    });

    test('button and a are overlaid', function() {
      elem.innerHTML =
        '<button onclick="alert(1)">BUTTON</button> <a href="#A">A</a>';
      navigator.mozL10n.setAttributes(elem, 'struct-button-a');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<button onclick="alert(1)">Submit</button> or ' +
          '<a href="#A">cancel</a>.');
    });

    test('a and button are overlaid', function() {
      elem.innerHTML =
        '<button onclick="alert(1)">BUTTON</button> <a href="#A">A</a>';
      navigator.mozL10n.setAttributes(elem, 'struct-a-button');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<a href="#A">Cancel</a> or ' +
          '<button onclick="alert(1)">submit</button>.');
    });

    test('inputs are overlaid', function() {
      elem.innerHTML =
        '<input type="text"> <input type="submit" onclick="alert(1)">';
      navigator.mozL10n.setAttributes(elem, 'struct-input-input');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<input placeholder="Type here" type="text"> and ' +
          '<input value="send" onclick="alert(1)" type="submit">.');
    });

  });

  suite('filtering', function() {
    var elem;

    setup(function() {
      elem = document.createElement('div');
    });

    test('button is not allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'filter-button');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.innerHTML, 'Hello, world!');
    });

    test('onclick on em is not allowed', function() {
      navigator.mozL10n.setAttributes(elem, 'filter-em-onclick');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.innerHTML, 'Hello, <em>world</em>!');
    });

    test('onclick on button is not allowed', function() {
      elem.innerHTML = '<button onclick="alert(1)"></button>';
      navigator.mozL10n.setAttributes(elem, 'filter-button-onclick');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        'Hello, <button onclick="alert(1)">world</button>!');
    });

    test('href on a is not allowed', function() {
      elem.innerHTML = '<a href="#A">A</a>';
      navigator.mozL10n.setAttributes(elem, 'filter-href');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        'Read <a href="#A">more</a>.');
    });

    test('value on text input not allowed', function() {
      elem.innerHTML = '<input type="text" value="INPUT">';
      navigator.mozL10n.setAttributes(elem, 'filter-input-value');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<input value="INPUT" type="text">');
    });

    test('type on input not allowed', function() {
      elem.innerHTML = '<input type="text" placeholder="INPUT">';
      navigator.mozL10n.setAttributes(elem, 'filter-input-type');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<input placeholder="INPUT" type="text"> the form.');
    });

    test('nested button is not allowed', function() {
      elem.innerHTML = '';
      navigator.mozL10n.setAttributes(elem, 'filter-nested-button');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        '<em>No button.</em>');
    });

  });

  suite('Language change', function() {
    var elem;

    suiteSetup(function() {
      lang = 'lang2';
      elem = document.createElement('div');
      elem.innerHTML = '<a href="#A"></a>';
      navigator.mozL10n.setAttributes(elem, 'struct-a');
    });

    suiteTeardown(function(done) {
      lang = 'lang1';
      navigator.mozL10n.ctx.addEventListener('ready', function onReady() {
        navigator.mozL10n.ctx.removeEventListener('ready', onReady);
        done();
      });
      navigator.mozL10n.ctx.requestLocales(lang);
    });

    test('retranslation', function(done) {
      navigator.mozL10n.translateFragment(elem);
      assert.equal(
        elem.innerHTML,
        'Read <a title="MORE" href="#A">more</a>.');

      navigator.mozL10n.ctx.addEventListener('ready', function onReady() {
        navigator.mozL10n.ctx.removeEventListener('ready', onReady);
        navigator.mozL10n.translateFragment(elem);
        // XXX test known bad behavior;  the title attribute leaks from lang1
        // into lang2; see https://bugzil.la/922577
        assert.equal(
          elem.innerHTML,
          'Czytaj <a title="MORE" href="#A">więcej</a>.');
        done();
      });

      navigator.mozL10n.ctx.requestLocales(lang);
    });
  });

});
