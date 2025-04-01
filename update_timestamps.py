import json
import re
import requests
from bs4 import BeautifulSoup
import subprocess
import sys
from dateutil.parser import parse

def get_google_metadata(url):
    """
    Uses the external xeuledoc tool to fetch metadata for Google resources.
    Expected output format:
      [+] Creation date : 2023/04/10 15:11:23 (UTC)
      [+] Last edit date : 2023/10/20 15:01:51 (UTC)
    """
    try:
        result = subprocess.run(["xeuledoc", url], capture_output=True, text=True, check=True)
        output = result.stdout
        # Regex to extract the creation date and last edit date.
        creation_match = re.search(r'\[\+\]\s*Creation date\s*:\s*([\d/]+\s*[\d:]+\s*\(UTC\))', output)
        last_edit_match = re.search(r'\[\+\]\s*Last edit date\s*:\s*([\d/]+\s*[\d:]+\s*\(UTC\))', output)
        if creation_match:
            creation_date_str = creation_match.group(1).replace("(UTC)", "").strip()
            try:
                creation_iso = parse(creation_date_str).isoformat()
            except Exception:
                creation_iso = None
        else:
            creation_iso = None
        if last_edit_match:
            last_edit_date_str = last_edit_match.group(1).replace("(UTC)", "").strip()
            try:
                last_edit_iso = parse(last_edit_date_str).isoformat()
            except Exception:
                last_edit_iso = None
        else:
            last_edit_iso = None

        certainty = "high" if creation_iso and last_edit_iso else "low"
        return {"created": creation_iso, "updated": last_edit_iso, "certainty": certainty}
    except Exception as e:
        print(f"Error running xeuledoc for {url}: {e}", file=sys.stderr)
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
            created_attr = spans[0].get("title")
            if created_attr:
                try:
                    created = parse(created_attr).isoformat()
                except Exception:
                    created = None
            updated = created
            # If a span with "Last edit on:" exists, update the updated date.
            for span in spans:
                title = span.get("title", "")
                if "last edit on:" in title.lower():
                    try:
                        updated = parse(title.replace("Last edit on:", "").strip()).isoformat()
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
            # Find dates like MM/DD/YYYY or variants
            date_pattern = re.compile(r'(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})')
            dates = []
            for match in date_pattern.findall(html):
                try:
                    d = parse(match, dayfirst=False)
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
        return {"created":

