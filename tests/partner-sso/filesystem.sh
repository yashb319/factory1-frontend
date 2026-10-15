#!/usr/bin/env bash

TRAVERSE_PATHS=()
TRAVERSE_MODES=()

grant_test_traversal() {
  local target directory mode recorded recorded_path
  for target in "$@"; do
    directory="$(realpath "$target")"
    [[ -d "$directory" ]] || directory="$(dirname "$directory")"
    while [[ "$directory" != / ]]; do
      mode="$(stat -c %a "$directory")"
      if (( (8#$mode & 1) == 0 )); then
        recorded=false
        for recorded_path in "${TRAVERSE_PATHS[@]}"; do
          if [[ "$recorded_path" == "$directory" ]]; then recorded=true; break; fi
        done
        if [[ "$recorded" == false ]]; then
          TRAVERSE_PATHS+=("$directory")
          TRAVERSE_MODES+=("$mode")
          sudo chmod o+x "$directory"
        fi
      fi
      directory="$(dirname "$directory")"
    done
  done
}

restore_test_traversal() {
  local index
  for ((index=${#TRAVERSE_PATHS[@]}-1; index>=0; index--)); do
    sudo chmod "${TRAVERSE_MODES[index]}" "${TRAVERSE_PATHS[index]}" || true
  done
}
