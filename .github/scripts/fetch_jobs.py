"""Scarica le offerte di lavoro da JSearch (RapidAPI) secondo lavoro/criteri.json
e scrive il riepilogo in lavoro/offerte.json, letto dalla pagina lavoro/index.html.

Usa solo la libreria standard. La chiave API arriva dalla variabile d'ambiente
JSEARCH_API_KEY (in GitHub Actions è un "secret" del repository).
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CRITERI = ROOT / "lavoro" / "criteri.json"
OFFERTE = ROOT / "lavoro" / "offerte.json"

HOST = "jsearch.p.rapidapi.com"
URL = f"https://{HOST}/search"


def cerca(chiave, r):
    params = {
        "query": r["query"],
        "page": 1,
        "num_pages": 1,
        "country": r.get("paese", "it"),
        "date_posted": r.get("pubblicate_da", "3days"),
    }
    if r.get("solo_remoto"):
        params["work_from_home"] = "true"
    if r.get("contratti"):
        params["employment_types"] = ",".join(r["contratti"])
    req = urllib.request.Request(
        f"{URL}?{urllib.parse.urlencode(params)}",
        headers={"X-RapidAPI-Key": chiave, "X-RapidAPI-Host": HOST},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp).get("data") or []


def luogo(j):
    if j.get("job_location"):
        return j["job_location"]
    parti = [j.get("job_city"), j.get("job_state"), j.get("job_country")]
    return ", ".join(p for p in parti if p)


def stipendio(j):
    lo, hi = j.get("job_min_salary"), j.get("job_max_salary")
    if not lo and not hi:
        return None
    return {
        "min": lo,
        "max": hi,
        "valuta": j.get("job_salary_currency"),
        "periodo": j.get("job_salary_period"),
    }


def semplifica(j, oggi):
    desc = " ".join((j.get("job_description") or "").split())
    return {
        "id": j["job_id"],
        "titolo": j.get("job_title") or "",
        "azienda": j.get("employer_name") or "",
        "logo": j.get("employer_logo"),
        "luogo": luogo(j),
        "remoto": bool(j.get("job_is_remote")),
        "contratto": j.get("job_employment_type"),
        "pubblicata": j.get("job_posted_at_datetime_utc"),
        "link": j.get("job_apply_link") or j.get("job_google_link"),
        "fonte": j.get("job_publisher"),
        "stipendio": stipendio(j),
        "estratto": desc[:280],
        "ricerche": [],
        "prima_vista": oggi,
    }


def main():
    chiave = os.environ.get("JSEARCH_API_KEY")
    if not chiave:
        sys.exit("Manca la variabile d'ambiente JSEARCH_API_KEY")

    criteri = json.loads(CRITERI.read_text(encoding="utf-8"))
    escludi = [p.lower() for p in criteri.get("escludi_parole", [])]
    storico = int(criteri.get("giorni_di_storico", 14))

    adesso = datetime.now(timezone.utc)
    oggi = adesso.date().isoformat()
    limite = (adesso - timedelta(days=storico)).date().isoformat()

    precedenti = {}
    if OFFERTE.exists():
        for o in json.loads(OFFERTE.read_text(encoding="utf-8")).get("offerte", []):
            if o.get("prima_vista", oggi) >= limite:
                precedenti[o["id"]] = o

    trovate, errori = {}, []
    for r in criteri["ricerche"]:
        try:
            risultati = cerca(chiave, r)
        except (urllib.error.URLError, TimeoutError, ValueError) as e:
            errori.append(f"{r['nome']}: {e}")
            continue
        for j in risultati:
            if not j.get("job_id"):
                continue
            testo = f"{j.get('job_title', '')} {j.get('employer_name', '')}".lower()
            if any(p in testo for p in escludi):
                continue
            o = trovate.get(j["job_id"]) or semplifica(j, oggi)
            if j["job_id"] in precedenti:
                o["prima_vista"] = precedenti[j["job_id"]]["prima_vista"]
            if r["nome"] not in o["ricerche"]:
                o["ricerche"].append(r["nome"])
            trovate[j["job_id"]] = o

    # Se una ricerca fallisce non perdiamo le offerte già viste negli ultimi giorni.
    for id_, o in precedenti.items():
        trovate.setdefault(id_, o)

    if errori and len(errori) == len(criteri["ricerche"]) and not precedenti:
        sys.exit("Tutte le ricerche sono fallite:\n" + "\n".join(errori))

    offerte = sorted(
        trovate.values(),
        key=lambda o: (o["prima_vista"], o.get("pubblicata") or ""),
        reverse=True,
    )
    OFFERTE.write_text(
        json.dumps(
            {
                "aggiornato": adesso.isoformat(timespec="minutes"),
                "ricerche": [r["nome"] for r in criteri["ricerche"]],
                "errori": errori,
                "offerte": offerte,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )
    nuove = sum(1 for o in offerte if o["prima_vista"] == oggi)
    print(f"{len(offerte)} offerte, {nuove} nuove oggi, {len(errori)} errori")
    for e in errori:
        print("  !", e)


if __name__ == "__main__":
    main()
