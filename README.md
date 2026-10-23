# Edward Mawela | Profile Website

Personal profile site for Edward Mawela, software developer and founder of
[Blue Monday Studios](https://www.bluemondaystudios.co.za). It is aimed at the
IT, software and CS job market in Johannesburg, Pretoria, Durban and Cape Town.

It's a static site written in plain HTML, CSS and JavaScript, with no build step.

## Structure

```
index.html          page content, meta tags and JSON-LD structured data
404.html            custom not-found page (noindex)
css/styles.css      design, including self-hosted @font-face rules
js/main.js          mobile nav, scroll reveal, active-section highlight
assets/img/         optimised photos (600/800/1000px, JPG + WebP) and share image
assets/fonts/       self-hosted Fraunces, Inter and JetBrains Mono (woff2, OFL)
assets/icons/       favicon SVG, PNG app icons, Apple touch icon
favicon.ico         legacy favicon
robots.txt          crawler rules + sitemap location
sitemap.xml         sitemap with image entries
site.webmanifest    app name, colours and icons
llms.txt            plain-text profile summary for AI search tools
```

## SEO checklist

- Update `dateModified` (JSON-LD) and `<lastmod>` (sitemap.xml) whenever content changes.
- Google Search Console: add `edwardmawela.tech` as a **Domain** property, verify with
  the DNS TXT record it gives you, then submit `https://edwardmawela.tech/sitemap.xml`.
- Bing Webmaster Tools: import the site from Search Console.
- Validate structured data at https://search.google.com/test/rich-results and
  share previews at https://www.linkedin.com/post-inspector/.
- Link to https://edwardmawela.tech from LinkedIn (Contact info → Website), GitHub
  profile and the Blue Monday Studios site.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Deploy

Live at **https://edwardmawela.tech**

`.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main`
(or run it manually from the Actions tab). One-time setup: in
**Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**,
and set **Custom domain** to `edwardmawela.tech` with **Enforce HTTPS** on.

DNS records at the domain registrar:

| Type  | Host | Value                                   |
|-------|------|-----------------------------------------|
| A     | @    | 185.199.108.153                         |
| A     | @    | 185.199.109.153                         |
| A     | @    | 185.199.110.153                         |
| A     | @    | 185.199.111.153                         |
| CNAME | www  | bluemondaystudios.github.io             |
