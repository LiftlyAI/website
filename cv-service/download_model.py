"""One-time fetch of the MediaPipe pose model (~9 MB) into models/.

    python download_model.py

After this the service runs fully offline. Re-run only if the file is
missing or corrupt.
"""

import os
import urllib.request

from pose import MODEL_PATH, MODEL_URL


def main() -> None:
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 1_000_000:
        print(f"already present: {MODEL_PATH} ({os.path.getsize(MODEL_PATH):,} bytes)")
        return
    print(f"downloading {MODEL_URL}")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print(f"saved {MODEL_PATH} ({os.path.getsize(MODEL_PATH):,} bytes)")


if __name__ == "__main__":
    main()
