# DDS Project Instructions

## Project at a glance

DDS is a C/C++ double-dummy bridge solver and library. This repository is based on the DDS 2.9.0 codebase; preserve its existing public API and cross-platform build conventions unless the task explicitly calls for a breaking change.

## Repository map

- `include/dll.h` is the public C-compatible API: public structures, constants, error codes, and exported function declarations. `include/portab.h` contains portability definitions.
- `src/` contains the solver and library implementation. Key areas:
  - `SolveBoard.cpp` and `SolverIF.cpp`: board-solving entry points and coordination.
  - `CalcTables.cpp`, `Par.cpp`, and `DealerPar.cpp`: double-dummy tables and par calculations.
  - `PBN.cpp`: PBN parsing and conversion.
  - `PlayAnalyser.cpp`: play-trace analysis.
  - `System.cpp`, `Scheduler.cpp`, `ThreadMgr.cpp`, `Memory.cpp`: threading, work scheduling, and memory/resource management.
  - `ABsearch.cpp`, `Moves.cpp`, `QuickTricks.cpp`, `LaterTricks.cpp`, `TransTable*.cpp`: search and solver internals.
- `src/Makefiles/` contains platform-specific library builds and the checked-in source/dependency lists.
- `test/` contains `dtest`, its CLI/input handling, and platform-specific Makefiles. `hands/` contains the test data and expected results.
- `examples/` contains small C++ programs demonstrating the library API.
- `main.c` is the Emscripten-facing C wrapper; `server.js` shows Node.js usage. `a.out.js` and `a.out.wasm` are generated WebAssembly artifacts, not hand-maintained source.
- `README.md` documents the project and WebAssembly command; `INSTALL` documents native builds and test modes; `doc/` contains API and algorithm documentation. Read the relevant documentation before changing the interface or build process.

## Implementation guidance

- Treat `include/dll.h` as the contract for consumers. Keep declarations, definitions, result/error semantics, tests, and examples in sync when changing a public function or structure. Prefer additive, ABI-compatible changes.
- Preserve the library's C-compatible API (`EXTERN_C`, `DLLEXPORT`, and `STDCALL` conventions) and platform-specific behavior. Avoid changing structure layouts or exported signatures without an explicit compatibility requirement.
- The core is legacy C++ and the Linux library Makefile compiles as C++11 with strict warnings treated as errors. Follow local formatting and idioms; do not introduce a newer language requirement or third-party dependency casually.
- DDS uses fixed-size public structures and arrays. Check documented capacity limits and existing return-code conventions before adding inputs or outputs; report errors using the established return codes rather than silently accepting invalid data.
- PBN conversion is shared library behavior, not just wrapper parsing. When changing PBN handling, inspect `PBN.cpp`, callers in `SolveBoard.cpp` / `CalcTables.cpp`, and the corresponding public PBN entry points.
- Threading and resource configuration are shared infrastructure. Changes in `System.cpp`, `Scheduler.cpp`, `ThreadMgr.cpp`, or `Memory.cpp` can affect all solver modes; preserve supported backends and check both single-threaded and configured threaded behavior where practical.
- Keep Emscripten-specific marshaling in `main.c` and JavaScript calling conventions in `server.js` consistent with the C API. Do not edit generated `.js` / `.wasm` outputs by hand; regenerate them with the README command only when a task requires updated artifacts.

## Build manifests and generated dependency lists

- The Makefiles use checked-in lists such as `src/Makefiles/sources.txt`, `src/Makefiles/depends_o.txt`, and the corresponding lists in `test/Makefiles/` and `examples/Makefiles/`. If adding or removing a translation unit, update the relevant source lists and dependency lists for every supported build surface.
- Do **not** run `make depend`: `INSTALL` explicitly warns against it, and the repository relies on its checked-in dependency files.
- Makefiles differ by platform and threading backend. Do not assume a Linux Makefile change automatically updates Windows or Mac builds; keep equivalent build definitions aligned when touching shared build behavior.
- Build products such as `.o`, `.a`, `.so`, `.dll`, `dtest`, and `itest` are not source files. Keep them out of commits unless the task explicitly requires a release artifact.

## Build and test on Linux

Requires GNU make and g++. Commands below are run from the repository root.

Build the static library:

```sh
make -C src -f Makefiles/Makefile_linux_static
```

Build `dtest` against that library:

```sh
make -C src -f Makefiles/Makefile_linux_static install
make -C test -f Makefiles/Makefile_linux
```

Run tests from `test/`, where the Makefile links against the locally installed library:

```sh
cd test
./dtest -f ../hands/list100.txt -s solve -n 4 -m 1000
```

`dtest` supports `solve`, `calc`, `play`, `par`, and `dealerpar` modes (`-s` / `--solver`). It also accepts `-f` / `--file`, `-t` / `--threading`, `-n` / `--numthr`, and `-m` / `--memory`; run `./dtest` without arguments for its usage text. Select an input file and mode appropriate to the code changed rather than relying only on one solver mode.

Useful focused checks:

- Library/API changes: rebuild the library and `dtest`, then run the test mode(s) exercising the changed API.
- Parser changes: include PBN-based test cases and malformed-input cases where supported by the existing test harness.
- Threading/resource changes: run with the default configuration and, when available, an explicit backend / thread count.
- Example changes: build the corresponding example using its platform Makefile after installing the library from `src/`.
- WebAssembly changes: use the Emscripten command in `README.md` if `emcc` is installed; otherwise state that the WebAssembly build was not run.

Consult `INSTALL` for platform-specific Makefile selection, configuration, and fuller test instructions. Report any unavailable compiler, threading backend, or test prerequisite rather than implying the related check passed.

## Change hygiene

- Keep changes scoped to the requested behavior; do not reformat unrelated legacy files or update generated binaries incidentally.
- Add or update tests/examples when changing externally observable behavior.
- Review the final diff for API compatibility, build-manifest updates, and generated files. Use `git diff --check` before finishing.
