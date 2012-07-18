The intent is that this folder eventually becomes a stand alone lib.

At the base level (provider)
there are a number of content providers.

Content providers each are responsible for providing calendars and
events which we eventually consume/persist in the form of "models" which
represent the local state of a resource. 

The difference (and intent of separation between models and provider
objects) is provider object always represent the state of the *server*
where models may or may not be in the same state and may also
contain changes which only we persist *locally*.

Each provider object _must_ use the same API to provide
an abstraction layer for models/stores. Each top level
provider object (e.g. Local) contains a list of capabilities
which effect how the models/stores interact with them.
