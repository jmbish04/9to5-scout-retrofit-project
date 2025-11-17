---
title: /screenshot - Capture screenshot · Cloudflare Browser Rendering docs
description: The /screenshot endpoint renders the webpage by processing its HTML
  and JavaScript, then captures a screenshot of the fully rendered page.
lastUpdated: 2025-11-03T19:24:47.000Z
chatbotDeprioritize: false
source_url:
  html: https://developers.cloudflare.com/browser-rendering/rest-api/screenshot-endpoint/
  md: https://developers.cloudflare.com/browser-rendering/rest-api/screenshot-endpoint/index.md
---

The `/screenshot` endpoint renders the webpage by processing its HTML and JavaScript, then captures a screenshot of the fully rendered page.

## Endpoint

```txt
https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot
```

## Required fields

You must provide either `url` or `html`:

- `url` (string)
- `html` (string)

## Common use cases

- Generate previews for websites, dashboards, or reports
- Capture screenshots for automated testing, QA, or visual regression

## Basic usage

### Take a screenshot from custom HTML

- curl

  Sets the HTML content of the page to `Hello World!` and then takes a screenshot. The option `omitBackground` hides the default white background and allows capturing screenshots with transparency.

  ```bash
  curl -X POST 'https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot' \
    -H 'Authorization: Bearer <apiToken>' \
    -H 'Content-Type: application/json' \
    -d '{
      "html": "Hello World!",
      "screenshotOptions": {
        "omitBackground": true
      }
    }' \
    --output "screenshot.png"
  ```

- TypeScript SDK

  ```typescript
  import Cloudflare from "cloudflare";

  const client = new Cloudflare({
    apiToken: process.env["CLOUDFLARE_API_TOKEN"],
  });

  const screenshot = await client.browserRendering.screenshot.create({
    account_id: process.env["CLOUDFLARE_ACCOUNT_ID"],
    html: "Hello World!",
    screenshotOptions: {
      omitBackground: true,
    },
  });

  console.log(screenshot.status);
  ```

### Take a screenshot from a URL

```bash
curl -X POST 'https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot' \
  -H 'Authorization: Bearer <apiToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "html": "Hello World!",
    "screenshotOptions": {
      "omitBackground": true
    }
  }' \
  --output "screenshot.png"
```

For more options to control the final screenshot, like `clip`, `captureBeyondViewport`, `fullPage` and others, check the endpoint [reference](https://developers.cloudflare.com/api/resources/browser_rendering/subresources/screenshot/methods/create/).

Notes for basic usage

- The `quality` parameter is not compatible with the default `.png` format and will return a 400 error. If you set `quality`, you must also set `type` to `.jpeg` or another supported format.
- By default, the browser viewport is set to **1920×1080**. You can override the default via request options.

## Advanced usage

Looking for more parameters?

Visit the [Browser Rendering PDF API reference](https://developers.cloudflare.com/api/resources/browser_rendering/subresources/screenshot/methods/create/) for all available parameters, such as setting HTTP credentials using `authenticate`, setting `cookies`, and customizing load behavior using `gotoOptions`.

### Capture a screenshot of an authenticated page

Some webpages require authentication before you can view their content. To capture a screenshot of these pages, you must provide valid session cookies. The following example navigates to a page that requires login. By providing a valid cookie in the `cookies` array, Browser Rendering will be able to access the secure content in order to capture the screenshot.

```bash
curl -X POST 'https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot' \
  -H 'Authorization: Bearer <apiToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://example.com/protected-page",
    "cookies": [
      {
        "name": "session_id",
        "value": "your-session-cookie-value",
        "domain": "example.com",
        "path": "/"
      }
    ]
  }' \
  --output "authenticated-screenshot.png"
```

### Navigate and capture a full-page screenshot

Navigate to `https://cloudflare.com/`, change the page size (`viewport`) and wait until there are no active network connections (`waitUntil`) or up to a maximum of `4500ms` (`timeout`) before capturing a `fullPage` screenshot.

```bash
curl -X POST 'https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot' \
  -H 'Authorization: Bearer <apiToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://cloudflare.com/",
    "screenshotOptions": {
       "fullPage": true
    },
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "gotoOptions": {
      "waitUntil": "networkidle0",
      "timeout": 45000
    }
  }' \
  --output "advanced-screenshot.png"
```

### Improve blurry screenshot resolution

If you set a large viewport width and height, your screenshot may appear blurry or pixelated. This can happen if your browser's default `deviceScaleFactor` (which defaults to 1) is not high enough for the viewport.

To fix this, increase the value of the `deviceScaleFactor`.

```json
{
  "url": "https://cloudflare.com/",
  "viewport": {
    "width": 3600,
    "height": 2400,
    "deviceScaleFactor": 2
  }
}
```

### Customize CSS and embed custom JavaScript

Instruct the browser to go to `https://example.com`, embed custom JavaScript (`addScriptTag`) and add extra styles (`addStyleTag`), both inline (`addStyleTag.content`) and by loading an external stylesheet (`addStyleTag.url`).

```bash
curl -X POST 'https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot' \
  -H 'Authorization: Bearer <apiToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://example.com/",
    "addScriptTag": [
      { "content": "document.querySelector(`h1`).innerText = `Hello World!!!`" }
    ],
    "addStyleTag": [
      {
        "content": "div { background: linear-gradient(45deg, #2980b9  , #82e0aa  ); }"
      },
      {
        "url": "https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/css/bootstrap.min.css"
      }
    ]
  }' \
  --output "screenshot.png"
```

### Capture a specific element using the selector option

To capture a screenshot of a specific element on a webpage, use the `selector` option with a valid CSS selector. You can also configure the `viewport` to control the page dimensions during rendering.

```bash
curl -X POST 'https://api.cloudflare.com/client/v4/accounts/<accountId>/browser-rendering/screenshot' \
  -H 'Authorization: Bearer <apiToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://example.com",
    "selector": "#example_element_name",
    "viewport": {
      "width": 1200,
      "height": 1600
    }
  }' \
  --output "screenshot.png"
```

Many more options exist, like setting HTTP credentials using `authenticate`, setting `cookies`, and using `gotoOptions` to control page load behaviour - check the endpoint [reference](https://developers.cloudflare.com/api/resources/browser_rendering/subresources/screenshot/methods/create/) for all available parameters.

### Set a custom user agent

You can change the user agent at the page level by passing `userAgent` as a top-level parameter in the JSON body. This is useful if the target website serves different content based on the user agent.

Note

The `userAgent` parameter does not bypass bot protection. Requests from Browser Rendering will always be identified as a bot.

## Troubleshooting

If you have questions or encounter an error, see the [Browser Rendering FAQ and troubleshooting guide](https://developers.cloudflare.com/browser-rendering/faq/).
