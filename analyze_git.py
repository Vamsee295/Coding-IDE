import subprocess
import os
from collections import Counter

def run_cmd(cmd):
    return subprocess.check_output(cmd, shell=True, text=True).splitlines()

def analyze():
    print("--- CONCISE GIT ANALYSIS ---")
    tracked_files = run_cmd("git ls-files")
    
    ext_counter = Counter()
    suspicious: list[str] = []
    
    for f in tracked_files:
        ext = os.path.splitext(f)[1].lower() or "no-extension"
        ext_counter[ext] += 1
        if any(x in f for x in ["node_modules", "target", "dist", "build"]):
            suspicious.append(f)

    print("\nFile Counts by Extension:")
    for ext, count in ext_counter.most_common():
         print(f" {ext}: {count}")

    print("\nForbidden Directories:")
    if suspicious:
         print(f" FOUND {len(suspicious)} files in forbidden dirs!")
         limit = min(5, len(suspicious))
         for i in range(limit):
              f = suspicious[i]
              print(f"  - {f}")
    else:
         print(" None found.")

    total = sum(ext_counter.values())
    print(f"\nTotal Tracked Files: {total}")

if __name__ == "__main__":
    analyze()
