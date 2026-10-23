# Edward Mawela | Profile Website

Personal profile site for Edward Mawela, software developer and founder of
[Blue Monday Studios](https://www.bluemondaystudios.co.za). It is aimed at the
IT, software and CS job market in Johannesburg, Pretoria, Durban and Cape Town.

It's a static site written in plain HTML, CSS and JavaScript, with no build step.

## Structure

```
index.html        page content and SEO metadata
css/styles.css    design: dark beige, navy and leather palette
js/main.js        mobile nav, scroll reveal, active-section highlight
assets/img/       optimised photos (JPG + WebP) and social share image
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Deploy

Any static host works: GitHub Pages (serve from the repo root), Netlify,
Vercel or Cloudflare Pages.

## To do

- Add direct contact details (email, LinkedIn, phone) in the `#contact` section of `index.html`.
- Once a domain is live, set absolute URLs for `og:image` and add a `<link rel="canonical">`.
