# gaia-container

Gaia Container is a drop-in replacement for generic container elements that provides convenience methods and behaviour for animations and drag-and-drop functionality.

It is intended to be used in place of such elements as div, span or section.

## Basic usage

With web components enabled, source the script and add a gaia-container element to your document, like so:

```html
<head>
  <script src='gaia-container/script.js'></script>
</head>

<body>
  <gaia-container drag-and-drop></gaia-container>
</body>
```

Standard DOM functions on the element are overridden, so children must be added via JavaScript. All children added will be wrapped inside another element with the class `gaia-container-child`, hereby referred to as the 'wrapper'. This is to allow the container to transform the element without interfering with user styling. Additional styling may be applied to the wrapper, but the `transform`, `position`, `top` and `left` style properties will always be controlled by the container. When an element is tapped or clicked, the `activate` signal will be dispatched on the container, with the event's `detail.target` set to the element that was activated.

The included [example](examples/basic.html) demonstrates a basic use of the element with animated addition, removal, relayout and drag-and-drop.

## Animations

The wrapper is positioned with transforms, so adding a `transition: transform 0.2s` rule to `.gaia-container-child` will provide animated position transforms.

Gaia container adds various style classes to the wrapper to allow for animating various states. When these style classes are added, the container waits for an animation to start with the same name as the style class. If this occurs, the style class will be removed after the animation ends, otherwise it will be removed after a very short delay.

* When an element is added to the container, the `added` style class is added to the wrapper.
* When an element is removed from the container, the `removed` style class is added to the wrapper. The element will be removed once any animations have finished, or imminently if there are no animations.
* When an element is being dragged, the `dragging` style class is added to the wrapper. This style class will remain until the element is dropped.

## Drag and drop

If the element has the attribute `drag-and-drop`, it will provide drag-and-drop behaviour for both mouse events and touch events. This attribute can be added and removed during run-time. Drags are initiated by long-pressing on an element. The delay for this can be customised by altering the `dragAndDropTimeout` attribute on the container, and defaults to 200ms. The default behaviour has elements being inserted after the element they're dropped on if that element is after it in the container, or before the element they're dropped on if that element is before it in the container.

Drag events all have the following attributes, except for `drag-rearrange` and `drag-finish`, which have no attributes:
* `detail.target`: The element the event was triggered by
* `detail.clientX`: The x-axis coordinate of the mouse or touch that triggered the event, in client-space
* `detail.clientY`: The y-axis coordinate of the mouse or touch that triggered the event, in client-space
* `detail.pageX`: The x-axis coordinate of the mouse or touch that triggered the event, in page-space
* `detail.pageY`: The y-axis coordinate of the mouse or touch that triggered the event, in page-space

In addition, the `drag-end` event has a `detail.dropTarget` attribute, which will be the element the dragged element was dropped on.

When a drag-and-drop is initiated, the `drag-start` event is dispatched on the container. If preventDefault is called on this event, the drag will be cancelled.
During movement, the `drag-move` event is dispatched periodically.
When the user lifts their finger or the mouse button, a `drag-end` event is dispatched. If preventDefault is called on this event, the default rearranging behaviour will be cancelled.
If `drag-end` wasn't prevented, and the user has dropped the element over another element in the container, the container will be rearranged as described above and the `drag-rearrange` event will be emitted.
Finally, the `drag-finish` event will be fired once the drag-and-drop is complete.

## Methods

All DOM methods continue to work on Gaia container. In addition, these methods have an extra parameter, `callback`, that executes a given callback function on completion.

In addition, an extra method, `reorderChild` is provided for convenience, with the parameters `element`, `referenceElement` and `callback`. This method will reorder a child that exists in the container before the given reference element, or at the end of the container if `referenceElement` is `null`.

As the container can't always know when to reorganise its children, a `synchronise` method is provided. When called, this method will check what layout the children should receive and updates their transforms to correspond to it. This method is called for the user whenever DOM manipulation happens directly on the container, but a user may need to call it after performing changes outside of the container that would affect its layout.

Two utility methods are also provided for convenience, `getChildFromPoint`, which retrieves a container child given client X and Y coordinates, and `getChildOffsetRect` which returns an object of the form `{ top: Y, left: X, width: W, height: H, bottom: Y+H, right: X+W }`.

## Testing

First, install the dependencies:
```bash
$ npm install
```

Then, you can run the tests by calling:
```bash
$ npm test
```

Or use the development mode where your files are watched and unit tests run on
changes:
```bash
$ npm run test-dev
```

## API

### Properties

#### gaiaContainer.children

#### gaiaContainer.firstChild

#### gaiaContainer.lastChild

#### gaiaContainer.dragAndDrop

#### gaiaContainer.dragAndDropTimeout

### Methods

#### gaiaContainer.appendChild()

#### gaiaContainer.removeChild()

#### gaiaContainer.replaceChild()

#### gaiaContainer.insertBefore()

#### gaiaContainer.reorderChild()

#### gaiaContainer.changeState()

#### gaiaContainer.startDrag()

#### gaiaContainer.continueDrag()

#### gaiaContainer.endDrag()

#### gaiaContainer.cancelDrag()

#### gaiaContainer.synchronise()

### Events

#### drag-start

#### drag-move

#### drag-end

#### drag-finish

#### drag-rearrange

#### activate
