# Email custom element cards

The cards used for the email interface are a set of custom elements that follow
a certain style of construction.

## Theory

Email uses custom elements for each screen of its interface, called a "card".
The `cards` module handles the management of the cards.

Each custom element card encapsulates its functionality -- the DOM and related
event handlers and model updates (either from `model` or the Mail API) are
coordinated inside the card.

The email custom elements **do not** use Shadow DOM for their interior HTML, but
instead just innerHTML a clone of a base HTML template (usually loaded by the
`template` loader plugin).

Shadow DOM is not used for the following reasons:

1) We serialize our HTML to a string in some cases for quick startup. By not
needing a Shadow DOM creation, we can get a clear capture of all the HTML, and
with the CSS loaded, we can drop in the first card shown purely from cache, not
needing any of our JavaScript to load (just the small html_cache_restore.js
bootstrap).

This approach will continue to be useful once service workers are available and
we can cache cards associated with an URL directly in the service worker cache.

This approach leads to a very fast-feeling startup, and we can be sure to get
something visually to the user for the first paint of the app, instead of
wasting that paint, and wasting the time for that paint, on a blank screen.

2) There are still rough edges with Shadow DOM, mainly around the right
visibility rules for selectors, and things like RTL. Plus, it is common to use
templates with `<content>` sections with it, and currently the content nodes do
not show up in the developer tooling, so it is even harder to use developer
tools to do some quick style editing during the development flow.

3) The CSS story is clearer than with a Shadow DOM approach. Email uses specific
CSS class names for specific styling purposes, and by avoiding the rough edges
around selectors into the Shadow DOM, and it is easier to debug.

This does mean that the CSS can be "disconnected" from the actual JS or HTML for
the card, but in practice, many UI elements are the same across cards.

## Implementation

The custom element mixin approach uses the one from
[jrburke/element](https://github.com/jrburke/element): an `element` and
`template` loader plugin that handle mixing in objects and a template to form
the final prototype that is given to document.registerElement. See that other
repo for more information.

The `element` module favors a "mixin" approach instead of prototypes. This is
mainly because we want to be able to mix in different behaviors for the
different custom element lifecycle events (The *Callback methods), and needing
to grab the "super" method to make sure to call it (if one exists) is cumbersome
with the prototype approach.

In general, there is a school of design thought that favors composition over
inheritance, and the mixins approach is in that school.

The module for each card exports an array of objects. These objects are then
"mixed in" together by `element` to create the prototype for the custom element.
Then, `element` calls `document.registerElement` to register the final custom
element, by the name given to `element`. This is important -- in general modules
should not name themselves, their name should be determined by who references
them. This allows better reuse and mixing, where the application that combines
the elements chooses the names.

This also means that the export of the cards object is not really usable on its
own, but relies on `element` to fully realize itself. So for any isolating
testing, it is important to use `element` to bring the element into existence.

Most elements use the `base` module to define the basic capabilities of the
card. It handles things like template wiring, and the use of the `data-prop` and
`data-event` attributes that show up in the card templates.
