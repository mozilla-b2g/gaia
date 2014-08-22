# Gaia Docker Taskenv

In an ideal system we could ship the exact test container environment
along with the source code that needs to run on it. With docker we can
get very very close (though limited to linux right now).

The goal here is to provide a very simple base docker image for use in
testing with the [docker test host](https://github.com/taskcluster/docker-taskhost) and [gaia](https://github.com/mozilla-b2g/gaia) (firefox os).


# Development

## Building the docker image

You need docker (version >= 1.2) installed already.

```sh
make docker_image
```

you now have a mozillab2g/gaia-testenv container. Pass DOCKER_TAG environment variable to make to change the container tag.

## Testing

### Script unit tests

The unit tests are written in node and test the generator scripts
throughly.

```sh
make test
```
