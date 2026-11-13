"""Create the stable evaluation PDFs without touching the source resume."""

from fixtures import prepare_fixture_pdfs


if __name__ == "__main__":
    paths = prepare_fixture_pdfs()
    for name, path in paths.items():
        print(f"Prepared {name} ({path.stat().st_size} bytes)")
