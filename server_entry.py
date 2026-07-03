import multiprocessing
import sys
import time

import uvicorn


def get_port() -> int:
    for arg in sys.argv[1:]:
        if arg.isdigit():
            return int(arg)
    return 8000


if __name__ == "__main__":
    multiprocessing.freeze_support()

    started = time.perf_counter()
    print("Kuli server: booting FastAPI...", flush=True)
    from app.main import app

    port = get_port()
    print(
        f"Kuli server: app imported in {(time.perf_counter() - started):.1f}s, starting uvicorn on port {port}...",
        flush=True,
    )
    uvicorn.run(app, host="127.0.0.1", port=port)
