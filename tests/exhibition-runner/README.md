# Exhibition

This repository is a functional proof of concept for an isolated (generally self updating) node enviornment and a central dispatcher program (similar to mach in gecko).

The intention here is to show what we can do with a few simple techniques to make hacking on systems which use node baesd automation much much better (arguably better then some of our other solutions since iojs is very portable).

## Demo:

The demo should be a simple one liner after cloning the repo (if it's not then I have some bugs to fix)...

```sh
./exhibition first attack!
```

## Design

## The "entrypoint" (./exhibition)

The self install logic is very simple and largely should explain itself I use a combination of os detetion / package.json hashing / exec to ensure we download the right node versions (it's configured in the same file) and also verify we are using the intended node_modules (this works even across branch changes because of hashing).

This has the following dependencies:

 - uname
 - bash
 - curl

(TLDR; should work out of the box just about anywhere darwin/linux)


## The command loader

The command loader is more complex and [docopt](https://github.com/docopt/docopt) and [babel](http://babeljs.io/) to provide a ES7 featureset and a documentation format that can wrap even the most awful of our tools (makefile) into nicer documented logic.

See the [examples](./examples) in particular the [config](./examples/exhibition.yml) which defines groups and how they map (directly inspired by mach).


## WHY NOT X

## Mach

Let me get this out of the way mach is awesome... I feel like python2.7 is not the best bet forever though and the loading strategy makes mach slower then even my unoptimized PoC (about 4x faster then runnihg mach help on gecko and it should scale because we load only text not python files and all their deps)
