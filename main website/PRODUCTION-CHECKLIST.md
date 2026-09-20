# Production checklist: anjor-tank.vercel.app

This folder is the whole site. Nothing here changes the page's content, styling or components. It adds the
things a live site needs around them: security headers, search and sharing metadata, and the files crawlers
and browsers ask for.

## 1. Deploy it

1. Copy **every file in this folder** into your project, including the hidden `.well-known/` folder and `tools/`.
   `vercel.json` is what applies the security headers, so the site is not hardened without it.
2. Before deploying, run `node tools/site.js check`. It should end with "All checks passed."
3. Deploy to production. If something looks wrong, use **Instant Rollback** on the previous deployment in the
   Vercel dashboard.

**Every time you edit `index.html`, run `node tools/site.js csp` before deploying.** The security policy lists
the exact fingerprint of the page's inline scripts, so any edit to them makes the page blank until the
fingerprint is refreshed. The `check` command catches this.

## 2. Verify it after deploying (about 10 minutes)

| Check | How | You want to see |
|---|---|---|
| Security headers | Paste the URL into securityheaders.com, or the MDN HTTP Observatory | A high grade; a Content-Security-Policy is present |
| Files exist | Open `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, `/og-image.jpg`, `/site.webmanifest` | Each loads (no 404) |
| Bad URL | Open `/nothing-here` | Your branded "Head back to a page that exists" page, and a 404 status |
| Site still runs | Click through every page, toggle the theme, open the command menu | Nothing blank, no errors in the browser console |
| Form | Send one real enquiry | It arrives in your inbox |
| Booking | Pick a day, press "See times", complete a test booking | It lands in Calendly, and you get the confirmation |
| LinkedIn link | Click "View my LinkedIn" | Opens your profile (I could not test this: LinkedIn blocks automated visits) |
| Link previews | Paste the URL into LinkedIn's Post Inspector, and into a WhatsApp chat | Title, description and the dark sharing image appear |

If the site is blank or a feature fails right after a header change, open the browser console. A message
starting "Refused to..." means the security policy blocked something. To investigate without breaking the site,
rename the header `Content-Security-Policy` to `Content-Security-Policy-Report-Only` in `vercel.json` and redeploy.

## 3. Get found

1. **Google Search Console**: add the property, verify it (an HTML tag or DNS record), submit `/sitemap.xml`,
   then use URL Inspection on the home page and press "Request indexing".
2. **Bing Webmaster Tools**: import from Search Console.
3. Give it a few days. A brand-new site is not indexed instantly.

## 4. Lock down the integrations

- **Web3Forms**: in your dashboard, restrict the access key to your site's domain so nobody else can send mail
  through it. The key is visible in the page source; that is normal, and this restriction is what protects it.
- **Calendly**: confirm the event type you want people to book is the one at `calendly.com/anjort2000`.

## 5. Decisions still open

| Decision | Current setting | To change it |
|---|---|---|
| Tab titles | Each page names itself ("Work — Anjor Tank"); Home reads "Anjor Tank — GTM engineering for commerce" | Set `TAB_TITLES=false` in `index.html`, then run `node tools/site.js csp` |
| Site address | `anjor-tank.vercel.app` | `node tools/site.js domain https://your-domain.com`, add the domain in Vercel, then redeploy. Decide this before promoting the site. |
| Search engines and AI crawlers | All allowed | Edit `robots.txt` |
| Clean page URLs | Off (pages are `/#/gtm`) | See section 6 |
| Privacy notice | None | The form collects names and emails and shares them with Web3Forms; Calendly handles bookings. A short notice is worth adding. This is your call, and not legal advice. |
| Analytics | None | If you add any, the security policy in `vercel.json` must be updated to allow it |

## 6. The biggest remaining discoverability limit

Pages are addressed with `#` (for example `/#/gtm`). Search engines ignore everything after the `#`, so they see
one page. Your GTM, Systems, Work and Simulators pages cannot show up in results on their own, and only the
home page can rank. Fixing this needs real page URLs (`/gtm`) and pre-rendered pages. It is a routing change, not
a content change, so it is deliberately left for a separate decision.

## 7. Known follow-ups (present before this phase, and not changed by it)

- **Colour contrast**: 64 elements, mostly the tertiary grey text, fall below the WCAG AA ratio.
- **Keyboard access**: 7 horizontally scrolling rows cannot be scrolled from the keyboard.
- **Headings**: 2 places skip a heading level (for example a `h1` followed by an `h3`).
- **Fonts**: they load from Google Fonts. Self-hosting them would avoid sending visitors' addresses to Google
  and remove one third-party request.

## What each file is for

| File | Purpose |
|---|---|
| `index.html` | The site. Only the head metadata, a no-JavaScript fallback and the tab-title function were added |
| `vercel.json` | Security headers, caching for images, clean URLs |
| `robots.txt`, `sitemap.xml` | Tell search engines what to read and where |
| `404.html` | The page shown for addresses that do not exist |
| `og-image.jpg` | The card shown when the link is shared (under 300 KB, which WhatsApp needs) |
| `favicon.ico`, `icon-*.png`, `apple-touch-icon.png`, `site.webmanifest` | Icons and app metadata; Google needs a real icon file |
| `.well-known/security.txt` | Where security researchers can reach you. It expires on 2027-09-20; renew it before then |
| `tools/site.js` | `check`, `csp` and `domain` commands described above |
