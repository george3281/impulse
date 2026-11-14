# Impulse

Team: George Ji and Justin Nguyen

**Elevator pitch:** A Chrome extension that blurs ads and posts pushing you to overspend, and shows what you've already spent in that category this month.

## Inspiration

It was late, one of us was hungry, and TikTok kept serving mukbang videos. One after another, people eating huge plates of fast food. Twenty minutes later he was in the car, driving 30 minutes to McDonald's.

That moment is how most impulse spending works. It isn't a budgeting problem. It's a moment: you see something built to make you want it, and you buy it before the thought finishes. Food delivery at 1 AM, a Shein haul, a new Fortnite skin. We've all tried blockers, and we all turn them off, because a hard block feels like being treated like a kid.

We noticed that what actually stops us is seeing the number. "I've already spent how much this month?" So we built a tool that puts that number on top of the thing trying to sell to you.

## What it does

Impulse is a Chrome extension that reads your real spending, finds where you overspend, and adds friction exactly where the temptation shows up.

- **Reads your spending.** It pulls your purchases from Capital One's Nessie API and sorts them into categories. Instead of generic buckets, Gemini reads your merchants and invents specific ones, like "Food Delivery Apps" or "Late-night Fast Food", grouped under broad groups: Food, Shopping, Gaming, Coffee, Rides, Subscriptions. Essentials like rent and groceries are never blocked.
- **You choose what to block.** The side panel shows your last 30 days. Your top category is blocked by default, and you can block up to 3 groups.
- **Blurs what tempts you.** On YouTube, TikTok and Instagram, Impulse finds ads and posts made to make you buy: mukbangs and food challenges, shopping hauls and unboxings, skins, item shops and loot openings. It blurs them with one fact on top: *"$582 spent on shopping in the last 30 days. Still want to see this?"*
- **Blocks ways to buy, not interests.** Recipes, tutorials, building guides and normal posts stay visible. A Fortnite item-shop video gets blurred; a Fortnite building tutorial doesn't.
- **Friction, not prison.** Every blur has a quiet "Show anyway" button that always works. Every block and every reveal is logged.
- **An honest savings estimate.** We count at most one avoided purchase per day that you were blocked and didn't click "Show anyway", times your average order in the blocked groups, and never more than you actually spent:

$$\text{est. saved} = \min\left(d \cdot \bar{o},\ S\right)$$

where $d$ is the number of days with a block and no reveal, $\bar{o}$ is your average order in the blocked groups, and $S$ is what you spent in those groups over the last 30 days.

The same feed looks different for different people. With our food-heavy persona, mukbangs blur and Shein hauls stay. Switch to our shopping-heavy persona and it flips. The bank data drives the behavior.

## How we built it

- **Chrome extension (Manifest V3):** a content script that finds posts and blurs them, a service worker that talks to our backend and caches results, and a side panel instead of a popup so it stays open while you browse.
- **Capital One Nessie:** a seed script creates personas (customers, accounts, merchants and a month of purchases), and the backend reads purchases from Nessie to rank your spending.
- **Gemini:** discovers each user's specific spending categories from their merchants, and places new merchants into those categories.
- **Jev (TypeSafe AI):** classifies every post on the page. For each one it answers two typed questions: which spending group it belongs to, and whether it's an ad, craving content, educational, or unrelated. A batch takes about 0.2 seconds.
- **Keyword fallback:** if an AI service is slow or down, a keyword and domain matcher keeps the extension working.
- **Neon Postgres:** stores the discovered categories and logs every block and "Show anyway".
- **Backend:** a small zero-dependency Node server that proxies Nessie, Gemini and Jev, so no API keys ever ship inside the extension.
- **Design:** we went through several directions and landed on something that feels native to Chrome: a calm side panel and a one-fact overlay with a deliberately unattractive "Show anyway" button.

## Challenges we ran into

- **Every site is built differently.** YouTube uses named components, TikTok uses test attributes, and Instagram recently stopped using `<article>` tags entirely. We ended up finding posts by their media: we trace each video or photo up to its post, then borrow the caption from the side panel when the video itself has no text.
- **Not blurring the whole page.** Early on, TikTok's video viewer got buried inside a blurred search-results list, with the "Show anyway" button off screen. We added a rule that anything holding more than one post is a list, not a post, plus a size limit so the button is always visible.
- **Defining "craving content".** Our first classifier only understood food and shopping, so Fortnite skin videos slipped through as "gameplay". We had to define what makes content tempting per category, while keeping tutorials and recipes visible.
- **AI services failing at the worst time.** Gemini's older model was retired for new keys, the newer one was overloaded, and then we hit rate limits. We moved page classification to Jev, saved Gemini's categories to Postgres, and kept a keyword fallback so the demo never depends on a live model call.
- **Honest numbers.** Our first savings estimate counted every blocked post as a purchase avoided, which made the number meaningless. The per-day model above is deliberately conservative.

## Accomplishments that we're proud of

- In our tests on live YouTube, searching "mcdonalds mukbang" blurred 41 of 41 results, while "learn python" blurred 0 of 44 and recipe searches stayed visible.
- "Fortnite item shop" blurred 32 of 32 results, while a Fortnite building tutorial search stayed visible.
- It works across YouTube, TikTok (feed, search, the video viewer and shared videos in DMs) and Instagram (posts, explore and reels).
- Blocks follow your real spending: switching personas changes what gets blurred on the same page.

## What we learned

- Friction works better than prohibition. A number you can dismiss is more persuasive than a wall you resent.
- Typed decision models like Jev are a much better fit for classifying a page than free-form text generation: fast, structured, and easy to validate.
- Building for other people's websites means planning for them to change under you. Detecting content by what it is (a video, a caption, a link) holds up better than relying on a site's specific markup.
- Every number shown to a user has to be defensible, especially when it's about their money.

## What's next for Impulse

- Real bank connections with user consent, instead of sandbox data.
- Intercepting checkout pages directly: "This order makes it $452 on food this month."
- Weekly summaries of what was blocked and how often you clicked through.
- Mobile, where most late-night scrolling actually happens.

*Prototype built on Capital One's Nessie sandbox data. Not financial advice.*
