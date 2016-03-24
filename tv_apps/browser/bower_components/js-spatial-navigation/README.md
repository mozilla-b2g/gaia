JavaScript SpatialNavigation
============================

A javascript-based implementation of Spatial Navigation.

* [Examples](#examples)
* [Documentation](#documentation)
  + [API Reference](#api-reference)
  + [Configuration](#configuration)
  + [Custom Attributes](#custom-attributes)
  + [Selector](#selector-1)
  + [Events](#events)
* [Browser Support](#browser-support)
* [License](#license)

Examples
--------

### Basic usage

```html
<head>
  <script src="https://luke-chang.github.io/js-spatial-navigation/spatial_navigation.js"></script>
  <script>
    window.addEventListener('load', function() {
      // Initialize
      SpatialNavigation.init();

      // Define navigable elements (anchors and elements with "focusable" class).
      SpatialNavigation.add({
        selector: 'a, .focusable'
      });

      // Make the *currently existing* navigable elements focusable.
      SpatialNavigation.makeFocusable();

      // Focus the first navigable element.
      SpatialNavigation.focus();
    });
  </script>
  <style>
    /* Add style to the focused elements */
    :focus {
      outline: 2px solid red;
    }
  </style>
</head>
<body>
  <a href="#">Link 1</a>
  <a href="#">Link 2</a>
  <div class="focusable">Div 1</div>
  <div class="focusable">Div 2</div>
</body>
```

### Integrate jQuery

Although SpatialNavigation is a standalone (pure-javascript-based) library, it can work perfectly with jQuery.

```html
<script src="https://code.jquery.com/jquery-2.2.1.min.js"></script>
<script>
  $.getScript('https://luke-chang.github.io/js-spatial-navigation/spatial_navigation.js', function() {
    $('a, .focusable')
      .SpatialNavigation()
      .focus(function() { $(this).css('outline', '2px solid red'); })
      .blur(function() { $(this).css('outline', ''); })
      .first()
      .focus();
  });
</script>
```

### More Demonstrations

+ [Demonstrations](http://luke-chang.github.io/js-spatial-navigation/demo/)

Documentation
-------------

### API Reference

#### `SpatialNavigation.init()`

Initializes SpatialNavigation and binds event listeners to the global object. It is a synchronous function, so you don't need to await ready state.

**Note:** It should be called before using any other methods of SpatialNavigation!

#### `SpatialNavigation.uninit()`

Uninitializes SpatialNavigation, resets the variable state and unbinds the event listeners.

#### `SpatialNavigation.clear()`

Resets the variable state without unbinding the event listeners.

#### `SpatialNavigation.add([sectionId], config)`

  + `sectionId`: (optional) String
  + `config`: [Configuration](#configuration)

Adds a section to SpatialNavigation with its own configuration. The `config` has not to contains all the properties. Those omitted properties will inherit global ones automatically.

A section is a conceptual scope to define a set of elements no matter where they are in DOM structure. You can group elements based on their functions or behaviors (e.g. main, menu, dialog, etc.) into a section.

Giving a `sectionId` to a section enables you to refer to it in other methods but is not required. SpatialNavigation allows you to set it by `config.id` alternatively, yet it is not allowed in [`set()`](#spatialnavigationsetsectionid-config).

#### `SpatialNavigation.remove(sectionId)`

  + `sectionId`: String

Removes the section with the specified `sectionId` from SpatialNavigation. Elements defined in this section will not be navigated anymore.

#### `SpatialNavigation.set([sectionId], config)`

  + `sectionId`: (optional) String
  + `config`: [Configuration](#configuration)

Updates the `config` of the section with the specified `sectionId`. If `sectionId` is omitted, the global configuration will be updated.

Omitted properties in `config` will not affect the original one, which was set by [`add()`](#spatialnavigationaddsectionid-config), so only properties that you want to update need to be listed. In other words, if you want to delete any previously added properties, you have to explicitly assign `undefined` to those properties in the `config`.

#### `SpatialNavigation.disable(sectionId)`

  + `sectionId`: String

Disables the section with the specified `sectionId` temporarily. Elements defined in this section will become unnavigable until [`enable()`](#spatialnavigationenablesectionid) is called.

#### `SpatialNavigation.enable(sectionId)`

  + `sectionId`: String

Enables the section with the specified `sectionId`. Elements defined in this section, on which if [`disable()`](#spatialnavigationdisablesectionid) was called earlier, will become navigable again.

#### `SpatialNavigation.pause()`

Makes SpatialNavigation pause until [`resume()`](#spatialnavigationresume) is called. During its pause, SpatialNavigation stops to react to key events and does not trigger any custom events.

#### `SpatialNavigation.resume()`

Resumes SpatialNavigation, so it can react to key events and trigger events which paused because of [`pause()`](#spatialnavigationpause).

#### `SpatialNavigation.focus([sectionId/selector], [silent])`

  + `sectionId/selector`: (optional) String / [Selector](#selector-1) (without @ syntax)
  + `silent`: (optional) Boolean

Focuses the section with the specified `sectionId` or the first element that matches `selector`.

If the first argument matches any of the existing `sectionId`, it will be regarded as a `sectionId`. Otherwise, it will be treated as `selector` instead.

If the first argument is omitted, the default section will be the substitution.

Please refer to [`setDefaultSection()`](#spatialnavigationsetdefaultsectionsectionid) for more details about the default section.

#### `SpatialNavigation.move(direction, [selector])`

  + `direction`: `'left'`, `'right'`, `'up'` or `'down'`
  + `selector`: (optional) Selector (without @ syntax)

Moves the focus to the given `direction` based on the rule of SpatialNavigation. The first element matches `selector` is regarded as the origin. If `selector` is omitted, SpatialNavigation will move the focus based on the currently focused element.

#### `SpatialNavigation.makeFocusable([sectionId])`

  + `sectionId`: (optional) String

A helper to add `tabindex="-1"` to elements defined in the specified section to make them focusable. If `sectionId` is omitted, it applies to all sections.

**Note:** It won't affect elements which have been focusable or have not been appended to DOM tree yet.

#### `SpatialNavigation.setDefaultSection([sectionId])`

  + `sectionId`: (optional) String

Assigns the specified section to be the default section. It will be used as a substitution in certain methods, of which if `sectionId` is omitted.

### Configuration

Configuration is a plain object with configurable properties.

There are two kinds of the configuration: global and per-section. If you call [`set(config)`](#spatialnavigationsetsectionid-config) without specifying `sectionId`, it will apply to the global one, from which the omitted per-section properties will inherit automatically.

Following is an example with default values.

```js
{
  selector: '',
  straightOnly: false,
  straightOverlapThreshold: 0.5,
  rememberSource: false,
  disabled: false,
  defaultElement: '',
  enterTo: '',
  leaveFor: null,
  restrict: 'self-first',
  tabIndexIgnoreList: 'a, input, select, textarea, button, iframe, [contentEditable=true]',
  navigableFilter: null
}
```

#### `selector`

  + Type: [Selector](#selector-1)
  + Default: `''`

Elements matching `selector` are all regraded as navigable elements in SpatialNavigation.

#### `straightOnly`

  + Type: Boolean
  + Default: `false`

When it is `true`, only elements in the straight (vertical or horizontal) direction will be navigated. i.e. SpatialNavigation ignores elements in the oblique directions.

#### `straightOverlapThreshold`

  + Type: Number in the range [0, 1]
  + Default: `0.5`

This threshold is used to determine whether an element is considered in the straight (vertical or horizontal) directions. Valid number is between 0 to 1.0.

Setting it to 0.3 means that an element is counted in the straight directions only if it overlaps the straight area at least 0.3x of its total area.

#### `rememberSource`

  + Type: Boolean
  + Default: `false`

When it is `true`, the previously focused element will have higher priority to be chosen as the next candidate.

#### `disabled`

  + Type: Boolean
  + Default: `false`

When it is `true`, elements defined in this section are unnavigable. This property is modified by [`disable()`](#spatialnavigationdisablesectionid) and [`enable()`](#spatialnavigationenablesectionid) as well.

#### `defaultElement`

  + Type: [Selector](#selector-1) (without @ syntax)
  + Default: `''`

When a section is specified to be the next focused target, e.g. [`focus('some-section-id')`](#spatialnavigationfocussectionidselector-silent) is called, the first element matching `defaultElement` within this section will be chosen first.

#### `enterTo`

  + Type: `''`, `'last-focused'` or `'default-element'`
  + Default: `''`

If the focus comes from another section, you can define which element in this section should be focused first.

`'last-focused'` indicates the last focused element before we left this section last time. If this section has never been focused yet, the default element (if any) will be chosen next.

`'default-element'` indicates the element defined in [`defaultElement`](#defaultelement).

`''` (empty string) implies following the original rule without any change.

#### `leaveFor`

  + Type: `null` or PlainObject
  + Default: `null`

This property specifies which element should be focused next when a user presses the corresponding arrow key and intends to leave the current section.

It should be a PlainObject consists of four properties: `'left'`, `'right'`, `'up'` and `'down'`. Each property should be a [Selector](#selector-1). Any of these properties can be omitted, and SpatialNavigation will follow the original rule to navigate.

**Note:** Assigning an empty string to any of these properties makes SpatialNavigation go nowhere at that direction.

#### `restrict`

  + Type: `'self-first'`, `'self-only'` or `'none'`
  + Default: `'self-first'`

`'self-first'` implies that elements within the same section will have higher priority to be chosen as the next candidate.

`'self-only'` implies that elements in the other sections will never be navigated by arrow keys. (However, you can always focus them by calling [`focus()`](#spatialnavigationfocussectionidselector-silent) manually.)

`'none'` implies no restriction.

#### `tabIndexIgnoreList`

  + Type: String
  + Default: `'a, input, select, textarea, button, iframe, [contentEditable=true]'`

Elements matching `tabIndexIgnoreList` will never be affected by [`makeFocusable()`](#spatialnavigationmakefocusablesectionid). It is usually used to ignore elements that are already focusable.

#### `navigableFilter`

  + Type: `'null'` or `function(HTMLElement)`
  + Default: `null`

A callback function that accepts a DOM element as the first argument.

SpatialNavigation calls this function every time when it tries to traverse every single candidate. You can ignore arbitrary elements by returning `false`.

### Custom Attributes

SpatialNavigation supports HTML `data-*` attributes as follows:

  + `data-sn-left`
  + `data-sn-right`
  + `data-sn-up`
  + `data-sn-down`

They specifies which element should be focused next when a user presses the corresponding arrow key on an element with these attributes. This setting overrides any other settings in [`enterTo`](#enterto) and [`leaveFor`](#leavefor).

The value of each attribute should be a [Selector](#selector-1). However, it only accepts **valid selector string** and **`@` syntax** for now. Any of these attributes can be omitted, and SpatialNavigation will follow the original rule to navigate.

**Note:** Assigning an empty string to any of these attributes makes SpatialNavigation go nowhere at that direction.

### Selector

The type "Selector" can be any of the following types.

* a valid selector string for "querySelectorAll" or jQuery (if it exists)
* a [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList) or an array containing DOM elements
* a single DOM element
* a jQuery object
* a string `'@<sectionId>'` to indicate the specified section
* a string `'@'` to indicate the default section

**Note:** Certain methods do not accept the `@` syntax.

### Events

Following custom events are triggered by SpatialNavigation. You can bind them by `addEventListener()`.

Focus-related events are also wrappers of the native `focus`/`blur` events, so they are triggered as well even SpatialNavigation is not involved. In this case, some properties in `event.detail` may be omitted. This kind of properties is marked **"Navigation Only"** below.

**Note:** If you bind events via jQuery's [`.on()`](http://api.jquery.com/on/) API, you must change to `event.originalEvent.detail` to access the `detail` objects.

#### `sn:willmove`

+ bubbles: `true`
+ cancelable: `true`
+ detail:
  - cause: `'keydown'` or `'api'`
  - sectionId: `<String>`
  - direction: `'left'`, `'right'`, `'up'` or `'down'`

Fired when SpatialNavigation is about to move the focus.

`cause` indicates why this move happens. `'keydown'` means triggered by key events while `'api'` means triggered by calling [`move()`](#spatialnavigationmovedirection-selector)) directly.

`sectionId` indicates the currently focused section.

`direction` indicates the direction given by arrow keys or [`move()`](#spatialnavigationmovedirection-selector) method.

#### `sn:willunfocus`

  + bubbles: `true`
  + cancelable: `true`
  + detail:
    - nextElement: `<HTMLElement>` (Navigation Only)
    - nextSectionId: `<String>` (Navigation Only)
    - direction: `'left'`, `'right'`, `'up'` or `'down'` (Navigation Only)
    - native: `<Boolean>`

Fired when an element is about to lose the focus.

`nextElement` and `nextSectionId` indicate where the focus will be moved next.

`direction` is similar to [`sn:willmove`](#snwillmove) but will be omitted here if this move is not caused by direction-related actions (e.g. by `@` syntax or [`focus()`](#spatialnavigationfocussectionidselector-silent) directly).

`native` indicates whether this event is triggered by native focus-related events or not.

**Note:** If it is caused by native `blur` event, SpatialNavigation will try to focus back to the original element when you cancel it (but not guaranteed).

#### `sn:unfocused`

  + bubbles: `true`
  + cancelable: `false`
  + detail:
    - nextElement: `<HTMLElement>` (Navigation Only)
    - nextSectionId: `<String>` (Navigation Only)
    - direction: `'left'`, `'right'`, `'up'` or `'down'` (Navigation Only)
    - native: `<Boolean>`

Fired when an element just lost the focus.

Event details are the same as [`sn:willunfocus`](#snwillunfocus).

#### `sn:willfocus`

  + bubbles: `true`
  + cancelable: `true`
  + detail:
    - sectionId: `<String>`
    - previousElement: `<HTMLElement>` (Navigation Only)
    - direction: `'left'`, `'right'`, `'up'` or `'down'` (Navigation Only)
    - native: `<Boolean>`

Fired when an element is about to get the focus.

`sectionId` indicates the currently focused section.

`previousElement` indicates the last focused element before this move.

`direction` and `native` are the same as [`sn:willunfocus`](#snwillunfocus).

**Note:** If it is caused by native `focus` event, SpatialNavigation will try to blur it immediately when you cancel it (but not guaranteed).

#### `sn:focused`

  + bubbles: `true`
  + cancelable: `false`
  + detail:
    - sectionId: `<String>`
    - previousElement: `<HTMLElement>` (Navigation Only)
    - direction: `'left'`, `'right'`, `'up'` or `'down'` (Navigation Only)
    - native: `<Boolean>`

Fired when an element just got the focus.

Event details are the same as [`sn:willfocus`](#snwillfocus).

#### `sn:navigatefailed`

  + bubbles: `true`
  + cancelable: `false`
    - direction: `'left'`, `'right'`, `'up'` or `'down'`

Fired when SpatialNavigation fails to find the next element to be focused.

`direction` is the same as [`sn:willunfocus`](#snwillunfocus).

#### `sn:enter-down`

  + bubbles: `true`
  + cancelable: `true`

Fired when ENTER key is pressed down.

#### `sn:enter-up`

  + bubbles: `true`
  + cancelable: `true`

Fired when ENTER key is released.

Browser Support
---------------

Chrome 5, Firefox 4, IE 9, Opera 10.5, Safari 5

License
-------

Copyright (c) 2016 Luke Chang. Licensed under the MPL license.
