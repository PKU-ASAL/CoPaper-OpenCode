"""CLI entry point for the `vibe` command."""

import click


@click.group()
def main() -> None:
    """VibePaper - AI-assisted academic writing framework."""
    pass


if __name__ == "__main__":
    main()
