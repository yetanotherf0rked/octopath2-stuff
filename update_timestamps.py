import json
import re
import requests
from bs4 import BeautifulSoup
import datetime
from dateutil.parser import parse
import sys

# Import the xeuledoc package (make sure it's installed via pip)
import xeuledoc

def get_google_metadata(url):
    try:
        metadata = xeuledoc.get_metadata(url)
        return {
            "created": metadata.get("created"),
            "updated": metadata.get("updated"),
            "certainty": "high"
        }
    except Exception as e:
        print(f"xeuledoc error for {url}: {e}", file=sys.stderr)
        return {"created": None, "updated": None, "certainty": "low"}

def get_paste_metadata(url):
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        html = resp.text
        soup = BeautifulSoup(html, "html.parser")
        date_div = soup.find("div", class_="date")
        if not date_div:
            return {"created": None, "updated": None, "certainty": "low"}
        spans = date_div.find_all("span")
        created = None
        updated = None
        if spans:
            # Use the title attribute of the first span for the creation date.
            created_attr = spans[0].get("title")
            if created_attr:
                try:
                    created_dt = parse(created_attr)
                    created = created_dt.isoformat()
                except Exception:
                    created = None
            updated = created
            # Look for an additional span indicating a last edit.
            for span in spans:
                title = span.get("title", "")
                if "last edit on:" in title.lower():
                    try:
                        updated_dt = parse(title.replace("Last edit on:", "").strip())
                        updated = updated_dt.isoformat()
                    except Exception:
                        pass
            return {"created": created, "updated": updated, "certainty": "high"}
        return {"created": None, "updated": None, "certainty": "low"}
    except Exception as e:
        print(f"Error fetching paste metadata for {url}: {e}", file=sys.stderr)
        return {"created": None, "updated": None, "certainty": "low"}

def get_changelog_metadata(url):
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        html = resp.text
        if "changelog" in html.lower():
            # Look for date strings like MM/DD/YYYY or similar.
            date_pattern = re.compile(r'(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})')
            matches = date_pattern.findall(html)
            dates = []
            for m in matches:
                try:
                    d = parse(m, dayfirst=False)
                    dates.append(d)
                except Exception:
                    continue
            if dates:
                dates.sort()
                return {
                    "created": dates[0].isoformat(),
                    "updated": dates[-1].isoformat(),
                    "certainty": "low"
                }
        return {"created": None, "updated": None, "certainty": "low"}
    except Exception as e:
        print(f"Error fetching changelog metadata for {url}: {e}", file=sys.stderr)
        return {"created": None, "updated": None, "certainty": "low"}

def get_metadata(url):
    if re.search(r'docs\.google\.com|drive\.google\.com|sheets\.google\.com', url, re.I):
        return get_google_metadata(url)
    elif re.search(r'pastebin\.com|pastemd\.netlify\.app', url, re.I):
        return get_paste_metadata(url)
    else:
        return get_changelog_metadata(url)

def process_object(obj):
    if isinstance(obj, list):
        for item in obj:
            process_object(item)
    elif isinstance(obj, dict):
        if "link" in obj:
            metadata = get_metadata(obj["link"])
            obj["created"] = metadata["created"]
            obj["updated"] = metadata["updated"]
            obj["certainty"] = metadata["certainty"]
        for key in obj:
            process_object(obj[key])

def main():
    try:
        with open("routes.json", "r", encoding="utf8") as f:
            routes_data = json.load(f)
        process_object(routes_data)
        with open("routes-with-timestamps.json", "w", encoding="utf8") as f:
            json.dump(routes_data, f, indent=2)
        print("Created routes-with-timestamps.json successfully.")
    except Exception as e:
        print("Error processing routes:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

