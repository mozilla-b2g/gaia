'use strict';

/* global utils */

requireApp('communications/contacts/js/utilities/misc.js');

suite('Contacts/utilities/parseName >', function() {
  var subject;

  suiteSetup(function() {
    subject = utils.misc.parseName;
  });

  function assertNames(out, gn, fn) {
    assert.equal(out.givenName, gn);
    assert.equal(out.familyName, fn);
  }

  test('Empty string', function() {
    var out = subject('');

    assertNames(out, '', '');
  });

  test('Blank string', function() {
    var out = subject('   ');

    assertNames(out, '', '');
  });

  test('Null string', function() {
    var out = subject(null);

    assertNames(out, '', '');
  });

  test('Only a component', function() {
    var out = subject('Jose');

    assertNames(out, 'Jose', '');
  });

  test('Two Components', function() {
    var out = subject('Jose Cantera');

    assertNames(out, 'Jose', 'Cantera');
  });

  test('Two Components. Pathological case (I)', function() {
    var out = subject('J. C.');

    assertNames(out, 'J.', 'C.');
  });

  test('Two Components. Pathological case without dots', function() {
    var out = subject('J C.');

    assertNames(out, 'J', 'C.');
  });

  test('Two Components. Pathological case (II)', function() {
    var out = subject('Jose C.');

    assertNames(out, 'Jose', 'C.');
  });

  test('Two Components. Pathological case (III)', function() {
    var out = subject('J. Cantera');

    assertNames(out, 'J.', 'Cantera');
  });

  test('Three Components', function() {
    var out = subject('Jose Manuel Cantera');

    assertNames(out, 'Jose Manuel', 'Cantera');
  });

  test('Three Components. Only two are significative', function() {
    var out = subject('Gunilla von Bismarck');

    assertNames(out, 'Gunilla', 'von Bismarck');
  });

  test('Three Components. Abbreviation', function() {
    var out = subject('Jose M. Cantera');

    assertNames(out, 'Jose M.', 'Cantera');
  });

  test('Four Components', function() {
    var out = subject('Jose Manuel Cantera Fonseca');

    assertNames(out, 'Jose Manuel', 'Cantera Fonseca');
  });

  test('Four Components. Three are given Name', function() {
    var out = subject('María del Mar González');

    assertNames(out, 'María del Mar', 'González');
  });

  test('Four Components.', function() {
    var out = subject('María de la O Álvarez');

    assertNames(out, 'María de la O', 'Álvarez');
  });

  test('Four Components. Three are family Name', function() {
    var out = subject('Carlos de la Fuente');

    assertNames(out, 'Carlos', 'de la Fuente');
  });

  test('Five Components. Three are family Name', function() {
    var out = subject('Carlos de la Fuente González');

    assertNames(out, 'Carlos de la Fuente', 'González');
  });

  test('Five Components', function() {
    var out = subject('Cristina Federica Leonor Ávila Álvarez');

    assertNames(out, 'Cristina Federica Leonor', 'Ávila Álvarez');
  });

  test('Six Components', function() {
    var out = subject('Cristina Federica Leonor Juana Ávila Álvarez');

    assertNames(out, 'Cristina Federica Leonor Juana', 'Ávila Álvarez');
  });

  test('German name', function() {
    var out = subject('Niklas Boehm');

    assertNames(out, 'Niklas', 'Boehm');
  });

  test('French name', function() {
    var out = subject('Madelene Pirouet');

    assertNames(out, 'Madelene', 'Pirouet');
  });

  test('North American name', function() {
    var out = subject('Arthur J. McNitt');

    assertNames(out, 'Arthur J.', 'McNitt');
  });

  test('Brazilian name', function() {
    var out = subject('Ronaldo Luís Nazário de Lima');

    assertNames(out, 'Ronaldo Luís', 'Nazário de Lima');
  });
});
