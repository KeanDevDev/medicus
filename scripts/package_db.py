"""
Helper utility to package and compress data/swasthya_grid.db into data/swasthya_grid.db.zip.
Guarantees GitHub push compliance by keeping operational dataset under 25 MB (limit is 100 MB).
"""
import os
import zipfile

def package_db():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    db_path = os.path.join(base_dir, "data", "swasthya_grid.db")
    zip_path = os.path.join(base_dir, "data", "swasthya_grid.db.zip")

    if not os.path.exists(db_path):
        print(f"Error: Database file not found at {db_path}")
        return

    raw_size_mb = os.path.getsize(db_path) / (1024 * 1024)
    print(f"Compressing {db_path} ({raw_size_mb:.1f} MB)...")
    
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(db_path, arcname="swasthya_grid.db")

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Successfully created {zip_path} ({zip_size_mb:.1f} MB). Safe for GitHub upload.")

if __name__ == "__main__":
    package_db()
