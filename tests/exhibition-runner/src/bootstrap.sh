#! /bin/bash -e


ROOT=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
IOJS_PATH=$ROOT/.exhibition/iojs/$IOJS_VER/
NPM_HASH_FILE=$ROOT/node_modules/.exhibition.md5
IOJS_VER=$(cat $ROOT/.exhibition/iojs_version)

##### Configuration helpers

get_iojs_os() {
  uname -s | tr '[:upper:]' '[:lower:]'
}

get_iojs_arch() {
  if [ "$(uname -m)" == "x86_64" ];
  then
    echo 'x64';
  else
    echo 'x86';
  fi
}

# Hack to generate md5 in cross platform way (using node which we install)
md5() {
  local path=$1
  # WTF? This super long js string will read a file and output a md5... This
  # looks terrible but saves the need of dealing with md5/md5sum utils which
  # vary in output..
  local cmd="var crypto = require('crypto');var fs = require('fs');console.log(crypto.createHash('md5').update(fs.readFileSync('$path', 'utf8')).digest('hex'));"
  node -e "$cmd"
}


# Download IOJS and return the path to the bin directory...
download_iojs() {
  local url="https://iojs.org/dist/$IOJS_VER/iojs-${IOJS_VER}-$(get_iojs_os)-$(get_iojs_arch).tar.gz"

  # Already installed iojs...
  if [ -x $IOJS_PATH/bin/iojs ];
  then
    return
  fi

  if ! which curl ;
  then
    echo "Please install curl so we can install everything else for you :)"
    exit 1
  fi

  # Install IO JS...
  mkdir -p $IOJS_PATH
  cd $IOJS_PATH
  curl $url | tar -xz --strip-components 1
  cd -

  # Validate the install...
  if ! $IOJS_PATH/bin/iojs --version ;
  then
    echo "Error installing IO JS"
    exit 1
  fi

  echo $IOJS_PATH/bin/
}

npm_install() {
  local package_hash=$(md5 $ROOT/package.json)
  local install_hash=""

  # Wrapped in this if statement to suppress any unwanted output...
  if [ -f $NPM_HASH_FILE ];
  then
    install_hash=$(cat $NPM_HASH_FILE)
  fi

  if [ "$install_hash" == "$package_hash" ];
  then
    return
  fi

  cd $ROOT
  npm install
  cd -
  echo $package_hash > $NPM_HASH_FILE
}

##### Configuration for exhibition
download_iojs $IOJS_VER
PATH=$IOJS_PATH/bin:$PATH
npm_install

##### Your Command stuff with the clean node environment...
exec node $ROOT/node_modules/.bin/exhibition $ROOT $@
