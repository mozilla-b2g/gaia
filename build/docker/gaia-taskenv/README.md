# Gaia Docker Taskenv

In an ideal system we could ship the exact test container environment
along with the source code that needs to run on it. With docker we can
get very very close (though limited to linux right now).

The goal here is to provide a very simple base docker image for use in
testing with [taskcluster](http://docs.taskcluster.net/).

# Development

## Building the docker image

You need docker (version >= 1.2) installed already (you must be in the
[build/docker/gaia-taskenv](/build/docker/gaia-taskenv) directory.

```sh
./build.sh
```

You now have a mozillab2g/gaia-testenv container. Name and version
are specified via the [DOCKER_TAG](./DOCKER_TAG) file and
[VERSION](./VERSION) files.
