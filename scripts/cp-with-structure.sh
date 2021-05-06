#!/bin/bash
src=(${*: 1})
dest=${*: -1:1}
for filename in $src; do
  [ -e "$filename" ] || continue
  dirPath=$(dirname "${filename}")
  mkdir -p $dest/$dirPath
  cp -a $filename $dest/$dirPath
done
