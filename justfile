DIST_DIR := "dist"

default: help

# list available recipes
help:
  @just --list --unsorted

# bundle the extension into dist/
build:
  @echo "==> build"
  bun run build

# dev server (hot reload). Supports extra args
dev *ARGS:
  @echo "==> dev server"
  bun run serve {{ARGS}}

# type-check all TypeScript sources
tc:
  @echo "==> typecheck"
  bun run tc

# run tests
test *ARGS:
  @echo "==> test"
  bun run test

# format sources
fmt *ARGS:
  @echo "==> format"
  bun run fmt {{ARGS}}

# verify formatting without writing changes
fmt-check:
  @echo "==> format check"
  bun run fmt:check

lint *ARGS:
  @echo "==> lint"
  bun run lint {{ARGS}}
  bun run slint

# run all quality gates: typecheck + test + format check
checks: tc test fmt-check lint

ci: checks

# removes build outputs
clean:
  @echo "==> clean"
  rm -rf {{DIST_DIR}}
