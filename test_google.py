import requests, os
from dotenv import load_dotenv
load_dotenv(".env.local")

key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
url = "https://places.googleapis.com/v1/places:searchText"

headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key,
    "X-Goog-FieldMask": "places.id,places.displayName",
}

body = {
    "textQuery": "ZANZIBAR bar Lomé Togo",
    "languageCode": "fr",
}

res = requests.post(url, headers=headers, json=body, timeout=10)
print("Status:", res.status_code)
print("Response:", res.text[:500])