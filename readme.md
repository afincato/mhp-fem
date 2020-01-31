# mhp-p2p: frontend embedded mockups

set of “self-contained” html pages to use with custom design and code, as a way to prototype final mockup for the frontend side of the [platform2platform](https://github.com/afincato/platform-2-platform) project.

## process

- webpage scraping
- custom design
- custom js to talk with mhp-p2p database

## notes

### scraping

refs:
- [make offline mirror of a site using wget](https://www.guyrutenberg.com/2014/05/02/make-offline-mirror-of-a-site-using-wget/)
- [wget man](https://www.gnu.org/software/wget/manual/wget.html)

eg 

```bash
wget -mkEpnp --wait=5 <url>
```


this is not recursive and download a single (sub-)page and related assets

``` bash
wget -m -np -p https://amateurcities.com/no-happy-endings/
```

the `wget` command works for `amateur-cities` as well as `online-open`. `open-set-reader` is a javascript single page application, therefore there’s just one `index.html` file and some javascript rendering everything.

to scrape this, a very basic but effective approach — if the numbers of pages is small (eg 5 in our case) — is to combine `wget` with Firefox `Save Page As > Web Page, Complete`, and manually (or programmatic) merge data from both sides. 

that is, put the assets downloaded by `wget` inside the `html` folder saved by Firefox. some urls inside each `index.html` need to be updated. plus, in the case of `open-set-reader`, pages lazy-load images. so again, rather than using puppeteer, an easy way is to scroll down the page to let all pictures download, while keeping the browser inspector open and set to the `network` tab; then get the origin url for each image, download it and put it in the `assets/imgs` folder.
