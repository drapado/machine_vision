# Cameras and Lenses - Interactive Exploration

An interactive educational website explaining how cameras and lenses work, based on the original work by [Bartosz Ciechanowski](https://ciechanow.ski/cameras-and-lenses/).

## Viewing Locally

To view the website locally, you can use any simple HTTP server. **Note: The demos require WebGL support, so use a modern browser like Chrome, Firefox, or Safari.**

### Using Python (Python 3)
```bash
python -m http.server 8080
```
Then open http://localhost:8080 in your browser (not VS Code's Simple Browser - use Chrome/Firefox/Safari).

## Publish on GitHub Pages

This repo is configured to deploy automatically to GitHub Pages using GitHub Actions.

1. Push this project to a GitHub repository.
2. Make sure your default branch is `main`.
3. In GitHub, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Push to `main` (or run the **Deploy static site to GitHub Pages** workflow manually in the **Actions** tab).

Your site URL will be:

`https://<your-github-username>.github.io/<repository-name>/`

If your repository is named `<your-github-username>.github.io`, the site will be served from the root:

`https://<your-github-username>.github.io/`

## References
This work is based on or inspired by the work and code of:

* https://ciechanow.ski/cameras-and-lenses/