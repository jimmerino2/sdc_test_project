# Smart Pantry & Recipe Matcher

A small Python script that suggests recipes based on the ingredients you already have, helping reduce food waste (UN SDG 12: Responsible Consumption and Production).

## How it works

1. Loads `recipes.csv` with pandas and parses each recipe's `;`-separated ingredients into a lowercase, trimmed list.
2. Asks you for the pantry items you have.
3. Scores each recipe by the percentage of its ingredients you already have, then prints a ranked list with calories, protein and any missing ingredients.

## Setup & Run

With [uv](https://docs.astral.sh/uv/):

```bash
uv venv
uv pip install -r requirements.txt
uv run pantry.py
```

Or with pip:

```bash
pip install -r requirements.txt
python pantry.py
```

Example:

```
Enter your pantry items (comma-separated): egg, onion, rice, carrot, soy sauce

Suggested meals:
1. Fried Rice - 100% match (480 kcal, 14g protein)
2. Chicken Stir Fry - 60% match (560 kcal, 38g protein)
...
```

## Files

- `pantry.py` – the script
- `recipes.csv` – recipe database (`name, ingredients, calories, protein_g`); add your own rows
- `requirements.txt` – dependencies
