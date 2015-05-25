curl http://nodejs.org/dist/v0.10.33/node-v0.10.33-linux-x64.tar.gz | tar xz
node_path=$(find $PWD -d -name 'node-v*' | head -n 1)
export PATH=$node_path:$PATH

Xvfb :99 &
export DISPLAY=:99
make test
