#!/bin/bash

## This script copies a file provided as the first parameter into the destination directory
## provided by the second parameter, while maintaining the directory structure of the source
## file. It is similar to 'cp --parents' on Linux, but usable cross-platform
src=(${*: 1})
dest=${*: -1:1}
for filename in $src; do
  [ -e "$filename" ] || continue
  dirPath=$(dirname "${filename}")
  mkdir -p $dest/$dirPath
  cp -a $filename $dest/$dirPath
done
