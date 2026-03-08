"""
create_folders.py
-----------------
Lit template_places.xlsx ou template_events.xlsx
et crée les dossiers correspondants dans ./places_files ou ./events_files

Usage :
    python create_folders.py places   -> lit template_places.xlsx, crée ./places_files/<nom>/
    python create_folders.py events   -> lit template_events.xlsx,  crée ./events_files/<nom>/
"""

import sys
import os
import re
import pandas as pd

def slugify(name: str) -> str:
    """Convertit un nom en nom de dossier valide : espaces → _, caractères spéciaux supprimés."""
    name = name.strip()
    name = re.sub(r"[^\w\s\-]", "", name, flags=re.UNICODE)
    name = re.sub(r"[\s]+", "_", name)
    return name

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("places", "events"):
        print("Usage : python create_folders.py [places|events]")
        sys.exit(1)

    mode = sys.argv[1]

    if mode == "places":
        excel_file  = "template_places.xlsx"
        output_dir  = "places_files"
        name_col    = "name"
    else:
        excel_file  = "template_events.xlsx"
        output_dir  = "events_files"
        name_col    = "title"

    if not os.path.exists(excel_file):
        print(f"❌ Fichier introuvable : {excel_file}")
        sys.exit(1)

    # Lire le fichier Excel en sautant les 2 premières lignes (titre + sous-titre)
    df = pd.read_excel(excel_file, header=2)  # row index 2 = ligne 3 = en-têtes

    # Nettoyer les noms de colonnes (enlève le " *" des colonnes obligatoires)
    df.columns = [str(c).replace(" *", "").strip() for c in df.columns]

    if name_col not in df.columns:
        print(f"❌ Colonne '{name_col}' non trouvée. Colonnes disponibles : {list(df.columns)}")
        sys.exit(1)

    # Filtrer les lignes vides + la ligne exemple (row 0 = exemple italique)
    names = df[name_col].dropna().astype(str).str.strip()
    names = names[names != ""]
    # Ignorer la première ligne si c'est l'exemple
    if len(names) > 0 and "Saint-Germain" in names.iloc[0] or "Afrobeats" in names.iloc[0]:
        names = names.iloc[1:]

    os.makedirs(output_dir, exist_ok=True)

    created = 0
    skipped = 0

    for name in names:
        folder_name = slugify(name)
        folder_path = os.path.join(output_dir, folder_name)
        if os.path.exists(folder_path):
            print(f"  ⏭️  Existe déjà : {folder_path}")
            skipped += 1
        else:
            os.makedirs(folder_path)
            print(f"  ✅ Créé : {folder_path}")
            created += 1

    print(f"\n{'─'*40}")
    print(f"✅ {created} dossier(s) créé(s)")
    print(f"⏭️  {skipped} dossier(s) ignoré(s) (existaient déjà)")
    print(f"📁 Répertoire : ./{output_dir}/")
    print(f"\n👉 Place maintenant tes images dans chaque dossier")
    print(f"   Nomme-les 1.jpg, 2.png, 3.jpg... (max 4 pour places, 1 pour events)")
    print(f"   Puis lance : python fill_media.py {mode}")

if __name__ == "__main__":
    main()
