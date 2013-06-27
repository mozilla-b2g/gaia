'use strict';

requireApp('sms/js/action_menu.js');



suite('OptionMenu', function() {
  var options, menu, formHeader, formSection;

  suiteSetup(function() {
    options = {
      id: 'menu-fixture',
      header: 'Text Header',
      section: 'Text Section',
      items: [
        {
          name: 'test',
          method: function(param) {

          },
          params: ['foo']
        },
        {
          name: 'cancel'
        }
      ]
    };
  });

  setup(function() {
    menu = new OptionMenu(options);

    formHeader = menu.form.querySelector('header');
    formSection = menu.form.querySelector('section');
  });
  teardown(function() {
    var fixture = document.getElementById('menu-fixture');

    if (fixture) {
      document.body.removeChild(fixture);
    }
  });

  suite('Instance', function() {

    test('OptionMenu', function() {
      assert.ok(OptionMenu);
      assert.ok(OptionMenu.prototype.show);
      assert.ok(OptionMenu.prototype.hide);
    });

    test('menu.show()', function() {
      menu.show();
      assert.equal(
        menu.form, document.body.lastElementChild
      );
    });

    test('menu.hide()', function() {
      menu.show();
      assert.equal(
        menu.form, document.body.lastElementChild
      );

      menu.hide();
      assert.notEqual(
        menu.form, document.body.lastElementChild
      );
    });
  });

  suite('Display', function() {
    test('header: text', function() {
      assert.equal(
        formHeader.textContent, 'Text Header'
      );
    });

    test('header: element', function() {
      options.header = document.createElement('header');
      options.header.textContent = 'Element Header';

      menu = new OptionMenu(options);
      formHeader = menu.form.firstElementChild;

      assert.equal(
        formHeader.textContent, 'Element Header'
      );
    });

    test('header: none', function() {
      options.header = null;
      menu = new OptionMenu(options);

      assert.isNull(menu.form.querySelector('header'));
    });


    test('section: text', function() {
      assert.equal(
        formSection.textContent, 'Text Section'
      );
    });

    test('section: element', function() {
      options.section = document.createElement('section');
      options.section.textContent = 'Element Section';

      menu = new OptionMenu(options);
      formSection = menu.form.firstElementChild;

      assert.equal(
        formSection.textContent, 'Element Section'
      );
    });

    test('section: none', function() {
      options.section = null;
      menu = new OptionMenu(options);

      assert.isNull(menu.form.querySelector('section'));
    });

  });

  suite('Options', function() {
    test('Buttons', function() {
      assert.equal(menu.form.querySelectorAll('button').length, 2);
    });
  });


  suite('Behaviours', function() {
    test('Fat fingering does not hide menu', function() {
      menu.show();
      menu.form.click();
      assert.equal(
        menu.form, document.body.lastElementChild
      );
    });
  });

});
