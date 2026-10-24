"""Smart Pantry & Recipe Matcher: suggest recipes from what you already have."""
import pandas as pd


def load_recipes(path="recipes.csv"):
    """Load recipes and parse the ingredient string into a clean, standardized list."""
    df = pd.read_csv(path)
    df["ingredients"] = df["ingredients"].str.lower().str.split(";").apply(
        lambda items: [i.strip() for i in items if i.strip()]
    )
    return df


def match_recipes(df, pantry):
    """Score each recipe by how many of its ingredients are in the pantry."""
    df = df.copy()
    df["have"] = df["ingredients"].apply(lambda ing: [i for i in ing if i in pantry])
    df["missing"] = df["ingredients"].apply(lambda ing: [i for i in ing if i not in pantry])
    df["match_pct"] = (df["have"].str.len() / df["ingredients"].str.len() * 100).round()
    # Only keep recipes that use at least one pantry item; best matches first,
    # higher protein breaks ties.
    df = df[df["have"].str.len() > 0]
    return df.sort_values(["match_pct", "protein_g"], ascending=False)


def main():
    recipes = load_recipes()
    raw = input("Enter your pantry items (comma-separated): ")
    pantry = {item.strip().lower() for item in raw.split(",") if item.strip()}

    results = match_recipes(recipes, pantry)
    if results.empty:
        print("No matching recipes found.")
        return

    print("\nSuggested meals:")
    for rank, row in enumerate(results.itertuples(), start=1):
        print(f"{rank}. {row.name} - {row.match_pct:.0f}% match "
              f"({row.calories} kcal, {row.protein_g}g protein)")
        if row.missing:
            print(f"   Missing: {', '.join(row.missing)}")


if __name__ == "__main__":
    main()
