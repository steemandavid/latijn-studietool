# Bronfoto's voor de mozaïeken

De foto's zelf staan **niet** in deze repo (`mozaieken/bron/` is genegeerd): het zijn
foto's van anderen onder CC BY-SA, en die verspreiden we niet mee. Hieronder staat waar
ze vandaan komen, zodat `importeer.py` opnieuw te draaien is.

| Mozaïek | Bestand in `bron/` | Commons | Licentie |
|---|---|---|---|
| cave-canem | `kandidaat-a.jpg` | [Cave Canem Poeta Trágico 02.jpg](https://commons.wikimedia.org/wiki/File:Cave_Canem_Poeta_Tr%C3%A1gico_02.jpg) | CC BY-SA 4.0 |

Ophalen gaat via de Commons-API (de thumb-URL zelf samenstellen geeft HTTP 400):

```bash
curl -s -H "User-Agent: VERBA-studietool/1.0 (jouw@adres)" \
  "https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File:<bestandsnaam>&prop=imageinfo&iiprop=url&iiurlwidth=1600"
```

**Bronvermelding is een voorwaarde, geen keuze.** Wordt een uit een foto afgeleid mozaïek
in de app opgenomen, dan hoort de fotograaf en de licentie in de colofon te staan — naast
de herkomst van het mozaïek zelf, die al bij elk paneel getoond wordt.
