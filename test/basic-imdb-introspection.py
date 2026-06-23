#!/usr/bin/env python3
"""Fetch iMDB GraphQL introspection data."""

import sys
from typing import Any, Dict

import requests


def fetch_introspection_data() -> Dict[str, Any]:
    url = "https://api.graphql.imdb.com/"
    payload = {
        "query": """
        {
            __type(name: \"Query\") {
                name
                fields {
                    name
                    args {
                        name
                        type {
                            name
                            kind
                        }
                    }
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                            ofType {
                                name
                                kind
                            }
                        }
                    }
                }
            }
        }
        """
    }

    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def main() -> int:
    try:
        data = fetch_introspection_data()
    except requests.RequestException as exc:
        print(f"Request error: {exc}", file=sys.stderr)
        return 1

    fields = data.get("data", {}).get("__type", {}).get("fields", [])
    names = [field.get("name") for field in fields if field.get("name")]

    print("Top-level Query field names:")
    for name in names:
        print(name)
    print(f"Count: {len(names)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
