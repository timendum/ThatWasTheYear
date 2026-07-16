DIST_DIR := "dist"

default: help

# list available recipes
help:
  @just --list --unsorted

# bundle the extension into dist/
build:
  @echo "==> build"
  deno task build

# dev server (hot reload). Supports extra args
dev *ARGS:
  @echo "==> dev server"
  deno task serve

# type-check all TypeScript sources
tc:
  @echo "==> typecheck"
  deno task tc

# run tests
test *ARGS:
  @echo "==> test"
  deno task test

# format sources
fmt *ARGS:
  @echo "==> format"
  deno run -A npm:oxfmt {{ARGS}}

# verify formatting without writing changes
fmt-check:
  @echo "==> format check"
  deno task fmt:check

lint *ARGS:
  @echo "==> lint"
  deno lint {{ARGS}}
  deno task lint {{ARGS}}
  deno task slint

# run all quality gates: typecheck + test + format check
checks: tc test fmt-check lint

ci: checks

# removes build outputs
clean:
  @echo "==> clean"
  rm -rf {{DIST_DIR}}
