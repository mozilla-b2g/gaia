# gaia-component [![](https://travis-ci.org/gaia-components/gaia-component.svg)](https://travis-ci.org/gaia-components/gaia-component)

A wrapper around `document.registerElement()` to define a custom-element with workarounds for gaps in the Gecko platform, plus some convenience methods.

## Installation

```bash
$ bower install gaia-components/gaia-component
```

## Examples

- [Example](http://gaia-components.github.io/gaia-component/)

## Usage

```js
var MyComponent = component.register('my-component', {
  created: function() {

    // Creates a shadow-root and
    // puts your template in it
    this.setupShadowRoot();
  },

  attributeChanged: function() {},
  attached: function() {},
  detached: function() {},

  template: `
    <button>I live in shadow-dom</button>
    <style>
      button { color: red }
    </style>
  `,

  // Some CSS doesn't work
  // in shadow-dom stylesheets,
  // this CSS gets put in the <head>
  globalCss: `
    @keyframes my-animation { ... }
    @font-face { ... }
  `,

  // Property descriptors that get defined
  // on the prototype and get called
  // when matching attributes change
  attrs: {
    customAttr: {
      get: function() { return this._customAttr; },
      set: function(value) { this._customAttr = value; }
    }
  }
});

var myComponent = new MyComponent();

myComponent.setAttribute('custom-attr', 'foo');
myComponent.customAttr; //=> 'foo';
```

## Tests

1. Ensure Firefox Nightly is installed on your machine.
2. `$ npm install`
3. `$ npm test`

If your would like tests to run on file change use:

`$ npm run test-dev`
