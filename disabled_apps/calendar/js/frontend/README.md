As part of a refactoring effort we're undertaking for the v3 calendar
app, we're moving everything that runs on the main thread into
`js/frontend/` and everything that runs in a worker into `js/backend`.
Instead of creating a fork for the v3 refactoring work that we'd have to
maintain, we've chosen to keep two parallel versions of calendar on
master. One thing to note is that the code in `js/backend/` and
`js/frontend/` is not used in any current, production versions.
