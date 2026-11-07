# Daten von Geldautomaten überschreiben
Beispiel:

```json
{
  "atms": [
    {
      "id": "custom-commerzbank-musterstrasse-1",
      "lat": 51.23456,
      "lon": 6.78901,
      "name": "Commerzbank",
      "operator": "Commerzbank",
      "address": "Musterstraße 1, 12345 Musterstadt",
      "openingHours": "Mo–Fr 06:00–23:00; Sa–So 08:00–22:00"
    }
  ]
}
```

Pflichtfelder sind `id`, `lat`, `lon`, `name` und `address`. 

`operator` und `openingHours` sind optional.
