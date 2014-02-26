/*global ContactRenderer, loadBodyHTML, MockContact, MockL10n, MocksHelper,
         Utils, Template, MockContactPhotoHelper */

'use strict';

require('/js/utils.js');
require('/test/unit/mock_utils.js');

require('/test/unit/mock_contact.js');
require('/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/js/contact_renderer.js');

var mocksHelperForContactRenderer = new MocksHelper([
  'Utils',
  'ContactPhotoHelper'
]).init();

suite('ContactRenderer', function() {
  var realMozL10n;

  var ul, contact;
  var testImageBlob;
  var renderer;

  mocksHelperForContactRenderer.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var assetsNeeded = 0;
    function getAsset(filename, loadCallback) {
      assetsNeeded++;

      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onload = function() {
        loadCallback(req.response);
        if (--assetsNeeded === 0) {
          done();
        }
      };
      req.send();
    }

    getAsset('/test/unit/media/kitten-450.jpg', function(blob) {
      testImageBlob = blob;
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
  });

  setup(function() {
    loadBodyHTML('/index.html');

    this.sinon.spy(Template.prototype, 'interpolate');
    ul = document.createElement('ul');
    contact = MockContact();
  });

  suite('suggestion', function() {
    setup(function() {
      renderer = ContactRenderer.flavor('suggestion');
    });

    test('Rendered Contact "givenName familyName"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: 'TEF, ',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: '+346578888888',
        numberHTML: '+346578888888',
        photoHTML: '',
        separator: ' | ',
        type: 'Mobile'
      });

      html = ul.firstElementChild.innerHTML;
      assert.include(html, 'Pepito O\'Hare');
    });

    test('Rendered Contact highlighted "givenName familyName"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'Pepito O\'Hare',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.include(html, '<span class="highlight">Pepito</span>');
      assert.include(html, '<span class="highlight">O\'Hare</span>');
    });

    test('Rendered Contact "number"', function() {
      var html;

      contact.tel[0].carrier = null;
      contact.tel[0].type = null;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains('+346578888888'));
    });

    test('Rendered Contact highlighted "number"', function() {
      var html;

      contact.tel[0].carrier = null;
      contact.tel[0].type = null;

      renderer.render({
        contact: contact,
        input: '346578888888',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: '',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: '+346578888888',
        numberHTML: '+<span class="highlight">346578888888</span>',
        photoHTML: '',
        separator: '',
        type: ''
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.contains('+<span class="highlight">346578888888</span>')
      );
    });

    test('Rendered Contact "type | number"', function() {
      var html;

      contact.tel[0].carrier = null;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains('<span data-l10n-id="Mobile">Mobile</span> | ' +
        '+346578888888'));
    });

    test('Rendered Contact highlighted "type | number"', function() {
      var html;

      contact.tel[0].carrier = null;

      renderer.render({
        contact: contact,
        input: '346578888888',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains(
        '<span data-l10n-id="Mobile">Mobile</span> | ' +
        '+<span class="highlight">346578888888</span>'
      ));
    });

    test('Rendered Contact "type | carrier, number"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains(
        '<span data-l10n-id="Mobile">Mobile</span> | ' +
        'TEF, +346578888888'
      ));
    });

    test('Rendered Contact highlighted "type | carrier, number"', function() {
      var html;

      renderer.render({
        contact: contact,
        input: '346578888888',
        target: ul
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.contains(
          '<span data-l10n-id="Mobile">Mobile</span> | ' +
          'TEF, +<span class="highlight">346578888888</span>'
        )
      );
    });

    test('Rendered Contact w/ multiple: all (isSuggestion)', function() {
      renderer.render({
        contact: contact,
        input: '+12125559999',
        target: ul
      });

      assert.equal(ul.children.length, 2);
    });

    test('Rendered Contact omit numbers already in recipient list', function() {
      var html;

      var skip = ['+346578888888'];

      // This contact has two tel entries.
      renderer.render({
        contact: contact,
        input: '+346578888888',
        target: ul,
        skip: skip
      });

      html = ul.innerHTML;

      assert.ok(!html.contains('346578888888'));
      assert.equal(ul.children.length, 1);
    });

    test('does not include photo', function() {
      var html;

      renderer.render({
        contact: contact,
        input: 'foo',
        target: ul
      });
      html = ul.firstElementChild.innerHTML;

      assert.isFalse(html.contains('span[data-type=img]'));
    });
  });

  suite('prompt', function() {
    setup(function() {
      renderer = ContactRenderer.flavor('prompt');
    });

    test('Rendered Contact w/ multiple: one', function() {
      renderer.render({
        contact: contact,
        input: '+12125559999',
        target: ul
      });

      assert.equal(ul.children.length, 1);
    });

    test('Rendered Contact w/ multiple: one w/ minimal match', function() {
      renderer.render({
        contact: contact,
        input: '5559999',
        target: ul
      });

      assert.equal(ul.children.length, 1);
    });

    test('Render contact without photo does not render the photo', function() {
      var html;
      renderer.render({
        contact: contact,
        input: '5559999',
        target: ul
      });
      html = ul.firstElementChild.innerHTML;

      assert.isFalse(html.contains('span[data-type=img]'));
    });

    test('Render contact with photo renders the image', function() {
      var html;
      var blob = testImageBlob;
      this.sinon.stub(MockContactPhotoHelper, 'getThumbnail').returns(blob);

      renderer.render({
        contact: contact,
        input: '5559999',
        target: ul
      });

      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        photoURL: sinon.match(/^blob:/)
      });

      var photo = 'span data-type="img" style="background-image: url(blob:';
      sinon.assert.calledWithMatch(Template.prototype.interpolate, {
        carrier: 'XXX, ',
        name: 'Pepito O\'Hare',
        nameHTML: 'Pepito O&apos;Hare',
        number: '+12125559999',
        numberHTML: '+12125559999',
        photoHTML: sinon.match(photo),
        separator: ' | ',
        type: 'B'
      });

      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains('span'));
    });
  });

  suite('Secure User Input', function() {
    setup(function() {
      this.sinon.stub(Utils, 'getContactDetails', function(number, contacts) {
        return {
          isContact: !!contacts,
          title: number
        };
      });
    });

    test('+99', function() {
      var ul = document.createElement('ul');

      assert.doesNotThrow(function() {
        var renderer = ContactRenderer.flavor('suggestion');

        renderer.render({
          contact: {
            name: 'Spider Monkey',
            tel: [{ value: '...' }]
          },
          input: '+99',
          target: ul
        });
      });

      sinon.assert.calledWith(Utils.getContactDetails, '...');
    });

    test('*67 [800]-555-1212', function() {
      var ul = document.createElement('ul');

      assert.doesNotThrow(function() {
        var renderer = ContactRenderer.flavor('suggestion');
        renderer.render({
          contact: {
            name: 'Spider Monkey',
            tel: [{ value: '...' }]
          },
          input: '*67 [800]-555-1212',
          target: ul
        });
      });

      sinon.assert.calledWith(Utils.getContactDetails, '...');
    });

    test('\\^$*+?.', function() {
      var ul = document.createElement('ul');
      assert.doesNotThrow(function() {
        var renderer = ContactRenderer.flavor('suggestion');
        renderer.render({
          contact: {
            name: 'Spider Monkey',
            tel: [{ value: '...' }]
          },
          input: '\\^$*+?.',
          target: ul
        });
      });
      sinon.assert.calledWith(Utils.getContactDetails, '...');
    });
  });

  suite('Defensive Contact Rendering', function() {
    test('has tel number', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();

      var renderer = ContactRenderer.flavor('suggestion');
      var isRendered = renderer.render({
        contact: contact,
        input: contact.tel[0].value,
        target: ul
      });

      assert.isTrue(isRendered);
    });

    test('no tel number', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      contact.tel = null;

      var renderer = ContactRenderer.flavor('suggestion');
      var isNotRendered = renderer.render({
        contact: contact,
        input: null,
        target: ul
      });

      assert.isFalse(isNotRendered);
    });
  });
});

