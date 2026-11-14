# Shared contract (backend <-> extension)

Backend base URL: `http://localhost:8787`. Nessie base: `https://api.nessieisreal.com` (plain http times out on some networks).

## Categories
Category ids are **discovered per user**: on first load the backend sends the merchant list to Gemini, which returns 4-10 specific categories (e.g. `delivery_apps` "Late-night delivery apps", `fast_food`, `designer_clothes`), each with a `parent` from the coarse table below and `keywords` used for ad matching. Merchants seen later are placed into that same list with one small Gemini call (cached in `backend/discovered.json`, gitignored). `GET /categories?rediscover=1` rebuilds it. Without `GEMINI_API_KEY` the coarse table itself is the taxonomy.

### Coarse parents
| id | label | discretionary |
|---|---|---|
| `food_delivery` | Food delivery & fast food | yes |
| `coffee_snacks` | Coffee & snacks | yes |
| `online_shopping` | Online shopping | yes |
| `gaming` | Gaming | yes |
| `subscriptions` | Subscriptions | yes |
| `rideshare` | Rideshare | yes |
| `essentials` | Essentials (rent, tuition, utilities, groceries) | no - never blocked |
| `other` | Other / not selling anything | no |

`food_delivery` covers fast food in general (McDonald's, etc.) and late-night food content like mukbangs.

## GET /categories
```json
{
  "month": "2026-11",
  "since": "2026-10-15",
  "source": "nessie" | "mock",
  "taxonomy": "gemini" | "lookup",
  "top": "delivery_apps",
  "categories": [
    { "id": "delivery_apps", "label": "Late-night delivery apps", "parent": "food_delivery", "keywords": ["doordash", "uber eats"], "total": 352, "count": 17, "lateNightCount": 15 }
  ],
  "essentialsTotal": 1250.00
}
```
`groups` = categories rolled up by `parent` with broad labels ("Food", "Shopping"); `top` is the top group id (blocked by default), so all of its specific categories are blocked together. `categories` = discretionary only, last 30 days (`since`), sorted by `total` desc. Nessie stores whole dollars.

## POST /classify
Request:
```json
{ "items": [ { "id": "el-3", "text": "Order now, $0 delivery fee", "alt": "", "href": "https://doordash.com/...", "adMarker": true } ] }
```
Response:
```json
{ "source": "gemini" | "keywords", "results": [ { "id": "el-3", "category": "delivery_apps", "selling": true } ] }
```
Each result also has `group` (the parent) and `trigger` (craving content such as mukbangs, eating challenges, hauls). The extension blurs when `group` is one of the blocked groups and `(selling || trigger)`. `category` is one of the discovered ids or `other`. Max 40 items per request. `selling: false` means content about the topic (recipe, review) but not a way to buy - must NOT be blurred.
