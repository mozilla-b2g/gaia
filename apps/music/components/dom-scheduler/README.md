# Dom Scheduler
[![](https://travis-ci.org/etiennesegonzac/dom-scheduler.svg)](https://travis-ci.org/etiennesegonzac/dom-scheduler)

## Concept
The DOM is pretty fast, layout is pretty fast, CSS transitions are
smooth... but doing any two of them at the same time can quickly cause
nasty performance glitches.

This explains why it's easy to demo a 60fps transition on a web app but
real-world usage is usually full of frame drops and other issues.

The **DomScheduler** is not an abstraction. It's a little helper making it
easy to express what type of operations you're doing, in which order. The
Scheduler then takes care of making sure everything happens with the
best perceived performance.

This project has 2 main goals:

  - Preventing trivial DOM changes in some unrelated part of your code from
    ruining a transition.
  - Enabling developers to easily express the ideal sequence for a
    change happening in phases (with Promise chains).

### Operations types by priotity
* _Direct_ manipulation
* Instant _feedback_
* _Transition_ / animation
* _Mutation_

#### What type of operation should I use?
As a rule of thumb

* anything that takes more than 16ms (including engine work) should be
  kept out of direct blocks
* feedback and transitions blocks should mainly contain hardware
  accelerated CSS transitions/animations
* in mutation blocks anything goes

Using debug mode with a browser timeline profiler can help you spot
issues (eg. a feedback block causing a reflow).
And you can always refer to the excellent
[CSSTriggers.com](http://csstriggers.com/) while writing new code.

### What's a typical ideal sequence?
Let's take a simple example like adding an item at the top of a list. To do
that smoothly we want to:

  - **[transition]** push everything down to make room for the new item
  - **[mutation]** insert the new item into the DOM but outside of the
    viewport (so the item doesn't flash on screen)
  - **[transition]** slide the new item in the viewport

Usually this means

```javascript
setupTransitionOnElements();
container.addEventListener('transitionend', function trWait() {
  container.removeEventListener('transitionend');
  writeToTheDOM();
  setupTransitionOnNewElement();
  el.addEventListener('transitionend', function stillWaiting() {
    el.removeEventListener('transitionend', stillWaiting);
    cleanUp();
  });
});
```

But of course we'd rather use promises to express this kind of sequence
like

```javascript
  pushDown(elements)
    .then(insertInDocument)
    .then(slideIn)
    .then(cleanUp)
```

Another badass sequence, using a promise-based storage system might be
something like

```javascript
Promise.all([reflectChangeWithTransitions(), persistChange()])
  .then(reflectChangeInDocument)
  .then(cleanUp)
```

* `reflectChangeWithTransition()` is a scheduled transition
* `persitChange()` is your backend call
* `reflectChangeInDocument` is a scheduled mutation
* `cleanUp` is a scheduled mutation

## Adopting the scheduler
To reap all the benefits from the scheduled approach you want

* to _"annotate"_ a maximum of your code, especially the mutations
* to use the shared scheduler instance (exported as `scheduler`)
* to use the debug mode (see below)

## API

### Direct blocks

Direct blocks should be used for direct manipulation (touchevents,
scrollevents...). As such they have the highest priority.

You _"attach"_ a direct block to a specific event.
The scheduler takes care of adding and removing event listeners.
The event object will be passed to the `block` as the first parameter.

#### Attaching a handler
`scheduler.attachDirect(elm, evt, block)`

#### Detaching a handler
`scheduler.detachDirect(elm, evt, block)`

#### Example
```javascript
scheduler.attachDirect(el, 'touchmove', (evt) => {
  el.style.transform = computeTransform(evt);
});
```

### Feedback blocks
`scheduler.feedback(block, elm, evt, timeout)`

Feedback blocks should be used to encapsulate CSS
transitions/animations triggered in direct response to a user interaction.
eg. button pressed state

They will be protected from DOM mutations to perform smoothly and they
return a promise fulfilled once `evt` is received on `elm` or after `timeout`ms.

The block will have the same priority than a _direct_ manipulation block.

#### Example
```javascript
scheduler.feedback(() => {
  el.classList.add('pressed');
}, el, 'transitionend').then(() => {
  el.classList.remove('pressed');
});
```

### Transition blocks
`scheduler.transition(block, elm, evt, timeout)`

Transitions blocks should be used to encapsulate CSS
transitions/animations.
They will be protected from DOM mutations to perform smoothly and they
return a promise fulfilled once `evt` is received on `elm` or after `timeout`ms.

#### Example
```javascript
scheduler.transition(() => {
  el.style.transition = 'transform 0.25s ease';
  el.classList.remove('new');
}, el, 'transitionend').then(() => {
  el.style.transition = '';
});
```


### Mutation blocks
`scheduler.mutation(block)`

Mutations blocks should be used to write to the DOM or perform actions
requiring the layout to be computed.

**We shoud always aim for the document to be (almost) visually identical
_before_ and _after_ a mutation block.
Any big change in layout/size will cause a flash/jump.**

Mutation blocks might be delayed (eg. during a transition) and they
return a promise fullfilled once the block is executed for chaining.

#### Example
```javascript
maestro.mutation(() => {
  el.textContent = 'Main List (' + items.length + ')';
});
```

## Scheduling heuristics (TBD)
  - `direct` blocks are encapsulated into `requestAnimationFrame`
  - `direct` blocks and `feedback transition` blocks have the highest
    priority and delay the rest
  - `transition` delays mutations
  - transitions are postponed while delayed mutations are being flushed
  - when both `transition`s and `mutation`s are queued because of direct
    manipulation, `transition`s are flushed first

## Debug mode
While it can have a negative impact on performance, it's recommended to
turn the debug mode on from time to time during development to catch
frequent mistakes early on.

Currently the debug mode will warn you about

* Transition block for which we never get an "end" event
* Direct blocks taking longer than 16ms

We're also using `console.time` / `console.timeEnd` to flag the
following in the profiler:
* `animating`, when a feedback or transition is ongoing
* `protecting`, when a direct protection window is ongoing

You can trun on the debug mode by setting `debug` to `true` in
`lib/dom-scheduler.js`.

## Demo APP
To illustrate the benefits of the scheduling approach the project comes
with a demo app: a **big** re-orderable (virtual) list where new content comes
in every few seconds. At random, the data source will sometime simulate
a case where the content isn't ready. And delay populating the content.

The interesting part is of course the _"real life"_ behaviors:
  - when new content comes in while scrolling
  - when the edit mode is toggled while the system is busy scrolling
  - when anything happens during a re-order manipulation

_(You can turn on the `naive` flag in `lib/dom-scheduler.js` to disable
scheduling and compare.)_

### Web page version
The `index.html` at the root of this repository is meant for broad device
and browser testing so we try to keep gecko/webkit/blink compatibility.

A (potentially outdated) version of the demo is usually accessible at
[http://sgz.fr/ds](http://sgz.fr/ds) and should work on any modern
browser.

### Packaged version
The `demo-app` directory is a certified packaged app where we experiment
with web components and other stuffs.

## Tests

1. `$ npm install`
2. `$ npm test`

If you would like tests to run on file change use:

`$ npm run test-dev`

## Lint check

Run lint check with command:

`$ npm run lint`

## License

Mozilla Public License 2.0

http://mozilla.org/MPL/2.0/
