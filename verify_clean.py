import subprocess

# Strict check for absolute prefixes that should BE IGNORED
FORBIDDEN_PREFIXES = ["node_modules/", "target/", "dist/", "build/"]

def verify():
    print("--- STRICT PREFIX VERIFICATION ---")
    tracked_files = subprocess.check_output("git ls-files", shell=True, text=True).splitlines()
    
    count = 0
    forbidden_found = []
    
    for f in tracked_files:
        _f = f.lower()
        if any(_f.startswith(p) for p in FORBIDDEN_PREFIXES):
             forbidden_found.append(f)
             count += 1

    if forbidden_found:
         print(f"ERROR: Found {count} files in forbidden paths!")
         for f in forbidden_found[:10]:
              print(f"  - {f}")
    else:
         print("SUCCESS: 0 files found in forbidden root paths (node_modules, target, dist, build).")
         print("Repository index is strictly clean and contains only source or assets.")

if __name__ == "__main__":
    verify()
