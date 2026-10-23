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

## To do

- Add direct contact details (email, LinkedIn, phone) in the `#contact` section of `index.html`.
