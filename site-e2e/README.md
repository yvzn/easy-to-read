# site-e2e

End-to-end tests for the `/site` module, using [Playwright](https://playwright.dev/) and TypeScript.

## Prerequisites

The site must be built before running the tests. The tests use a static server to serve the pre-built `_site` output.

### Build the site

From the `site/` directory, run:

```sh
cd ../site
npm install
# Set API URLs for the test build (pointing to localhost so they can be intercepted)
API_URL=http://localhost:7071 \
  SIMPLIFIED_TEXT_URL=http://localhost:7071/api/simplified \
  INTERACTION_URL=http://localhost:7071/api/interaction \
  FEEDBACK_URL=http://localhost:7071/api/feedback \
  CARBON_FOOTPRINT_URL=http://localhost:7071/api/carbon-footprint \
  npx dotenvx run --ignore MISSING_ENV_FILE -- eleventy
```

> **Note:** The site build attempts to download Google Fonts. If the network is unavailable, create a placeholder `fonts/fonts.css` file in the `site/` directory before building:
> ```sh
> mkdir -p ../site/fonts && echo "/* fonts placeholder */" > ../site/fonts/fonts.css
> ```

## Running the tests

```sh
cd site-e2e
npm install
npm test
```

The tests start a static server on port 3000 to serve the built site, and mock all API calls.

To run tests with the interactive UI:

```sh
npm run test:ui
```

## Test structure

All tests live in `tests/app.spec.ts` and cover the French app page (`/fr/app/`).

### Happy path

- Entering text containing the keyword **prénom** (first name), ticking **Traduire automatiquement en français**, submitting the form, and verifying:
  - The simplified output is visible and non-empty.
  - The keyword `prénom` from the original text appears in the output.
  - The output is in French (translation was applied).
- After simplification, the form is hidden and the result section is shown.
- The original text section appears with the user's input.

### Feedback dialog

- Feedback buttons appear after a successful simplification.
- Clicking a feedback button opens the feedback dialog.
- The dialog can be closed with the close button.
- Submitting the feedback form shows a success message.
