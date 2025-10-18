Cloudflare’s Browser Rendering API offers eight POST endpoints under /accounts/{account_id}/browser-rendering.

What’s included and how it works

Cloudflare’s Browser Rendering provides endpoints to render pages and extract structured outputs, all authenticated via an API Token with the permission “Browser Rendering Write.” Endpoints support loading via url or html, and expose granular controls like gotoOptions, waitForSelector, waitForTimeout, resource request allow/reject, headers, cookies, userAgent, viewport, and bestAttempt. It also supports adding script/style tags, HTTP authentication, and media emulation. The endpoints are:
• Content: Returns rendered HTML content as a string.
• Json: Extracts JSON using an LLM via prompt or schema; optional custom_ai fallback models.
• Links: Returns arrays of links with visibility and external-filtering options.
• Markdown: Returns page content as Markdown.
• PDF: Streams a PDF render (with pdfOptions).
• Scrape: Returns element-level meta (text, html, attributes, geometry).
• Screenshot: Performs screenshots (with screenshotOptions and optional selector/scrollPage).
• Snapshot: Returns both HTML content and a base64 screenshot.

Key security and parameters appear directly in the docs pages for each method. Below are exact excerpts for representative endpoints:

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.
Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Content:
Fetches rendered HTML content from provided URL or HTML. Check available options like gotoOptions and waitFor\* to control page load behaviour.

Json:
Gets json from a webpage from a provided URL or HTML. Pass prompt or schema in the body. Control page loading with gotoOptions and waitFor\* options.

Links:
Get links from a web page.

Markdown:
Gets markdown of a webpage from provided URL or HTML. Control page loading with gotoOptions and waitFor\* options.

PDF:
Fetches rendered PDF from provided URL or HTML. Check available options like gotoOptions and waitFor\* to control page load behaviour.

Scrape:
Get meta attributes like height, width, text and others of selected elements.

Screenshot:
Takes a screenshot of a webpage from provided URL or HTML. Control page loading with gotoOptions and waitFor\* options. Customize screenshots with viewport, fullPage, clip and others.

Snapshot:
Returns the page’s HTML content and screenshot. Control page loading with gotoOptions and waitFor\* options. Customize screenshots with viewport, fullPage, clip and others.

For complete parameter lists and return envelopes, see the individual “Get …” pages:
• Get HTML content. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/content/methods/create/)
• Get json. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/json/methods/create/)
• Get Links. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/links/methods/create/)
• Get markdown. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/markdown/methods/create/)
• Get PDF. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/pdf/methods/create/)
• Scrape elements. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/scrape/methods/create/)
• Get screenshot. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/screenshot/methods/create/)
• Get HTML content and screenshot. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/snapshot/methods/create/)

OpenAPI (JSON)

Below is a consolidated OpenAPI 3.0 JSON describing the eight endpoints, their shared path/query params, request bodies, and responses based on the documentation above. It models Cloudflare’s standard “status/errors/result” envelope where applicable, and uses application/pdf for the PDF stream. Some nested option schemas are represented in a compact form to keep the spec readable while covering all documented fields.{
"openapi": "3.0.3",
"info": {
"title": "Cloudflare Browser Rendering API",
"version": "2025-10-17",
"description": "Endpoints under /accounts/{account_id}/browser-rendering for rendering and extraction."
},
"servers": [
{
"url": "https://api.cloudflare.com/client/v4"
}
],
"security": [
{ "bearerAuth": [] }
],
"paths": {
"/accounts/{account_id}/browser-rendering/content": {
"post": {
"summary": "Get HTML content",
"description": "Fetches rendered HTML from provided URL or HTML.",
"parameters": [
{ "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
],
"requestBody": { "$ref": "#/components/requestBodies/CommonContentBody" },
        "responses": {
          "200": {
            "description": "HTML content (wrapped)",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiEnvelopeStringResult"
}
}
}
}
}
}
},
"/accounts/{account_id}/browser-rendering/json": {
"post": {
"summary": "Get JSON from page",
"description": "Extracts JSON using prompt or schema.",
"parameters": [
{ "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
],
"requestBody": {
"required": false,
"content": {
"application/json": {
"schema": {
"allOf": [
{ "$ref": "#/components/schemas/CommonLoadControls" },
{
"type": "object",
"properties": {
"prompt": { "type": "string" },
"schema": { "type": "object" },
"custom_ai": {
"type": "array",
"items": { "type": "object" }
},
"response_format": { "type": "object" }
}
}
]
}
}
}
},
"responses": {
"200": {
"description": "Extracted JSON (wrapped)",
"content": {
"application/json": {
"schema": { "$ref": "#/components/schemas/ApiEnvelopeObjectResult" }
              }
            }
          }
        }
      }
    },
    "/accounts/{account_id}/browser-rendering/links": {
      "post": {
        "summary": "Get links",
        "description": "Returns page links with visibility/external filters.",
        "parameters": [
          { "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "allOf": [
                  { "$ref": "#/components/schemas/CommonLoadControls" },
{
"type": "object",
"properties": {
"excludeExternalLinks": { "type": "boolean" },
"visibleLinksOnly": { "type": "boolean" }
}
}
]
}
}
}
},
"responses": {
"200": {
"description": "Links (wrapped)",
"content": {
"application/json": {
"schema": { "$ref": "#/components/schemas/ApiEnvelopeStringArrayResult" }
              }
            }
          }
        }
      }
    },
    "/accounts/{account_id}/browser-rendering/markdown": {
      "post": {
        "summary": "Get Markdown",
        "description": "Returns page content as Markdown.",
        "parameters": [
          { "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
        ],
        "requestBody": { "$ref": "#/components/requestBodies/CommonContentBody" },
"responses": {
"200": {
"description": "Markdown (wrapped)",
"content": {
"application/json": {
"schema": { "$ref": "#/components/schemas/ApiEnvelopeStringResult" }
              }
            }
          }
        }
      }
    },
    "/accounts/{account_id}/browser-rendering/pdf": {
      "post": {
        "summary": "Get PDF",
        "description": "Streams a PDF render of the page.",
        "parameters": [
          { "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "allOf": [
                  { "$ref": "#/components/schemas/CommonLoadControls" },
{
"type": "object",
"properties": {
"pdfOptions": { "type": "object" }
}
}
]
}
}
}
},
"responses": {
"200": {
"description": "PDF content",
"content": {
"application/pdf": {
"schema": { "type": "string", "format": "binary" }
}
}
}
}
}
},
"/accounts/{account_id}/browser-rendering/scrape": {
"post": {
"summary": "Scrape elements",
"description": "Returns meta and attributes for selected elements.",
"parameters": [
{ "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
],
"requestBody": {
"required": true,
"content": {
"application/json": {
"schema": {
"allOf": [
{ "$ref": "#/components/schemas/CommonLoadControls" },
                  {
                    "type": "object",
                    "properties": {
                      "elements": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "selector": { "type": "string" }
                          },
                          "required": ["selector"]
                        }
                      }
                    },
                    "required": ["elements"]
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Scrape results (wrapped)",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiEnvelopeScrapeArrayResult"
}
}
}
}
}
}
},
"/accounts/{account_id}/browser-rendering/screenshot": {
"post": {
"summary": "Get screenshot",
"description": "Performs screenshots with viewport/clip/fullPage and selector support.",
"parameters": [
{ "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
],
"requestBody": {
"required": false,
"content": {
"application/json": {
"schema": {
"allOf": [
{ "$ref": "#/components/schemas/CommonLoadControls" },
{
"type": "object",
"properties": {
"screenshotOptions": { "type": "object" },
"selector": { "type": "string" },
"scrollPage": { "type": "boolean" }
}
}
]
}
}
}
},
"responses": {
"200": {
"description": "Screenshot status (wrapped)",
"content": {
"application/json": {
"schema": { "$ref": "#/components/schemas/ApiEnvelopeStatusOnly" }
              }
            }
          }
        }
      }
    },
    "/accounts/{account_id}/browser-rendering/snapshot": {
      "post": {
        "summary": "Get HTML + screenshot",
        "description": "Returns both HTML content and a base64 screenshot.",
        "parameters": [
          { "$ref": "#/components/parameters/account_id" },
{ "$ref": "#/components/parameters/cacheTTL" }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "allOf": [
                  { "$ref": "#/components/schemas/CommonLoadControls" },
{
"type": "object",
"properties": {
"screenshotOptions": { "type": "object" }
}
}
]
}
}
}
},
"responses": {
"200": {
"description": "Snapshot result (wrapped)",
"content": {
"application/json": {
"schema": { "$ref": "#/components/schemas/ApiEnvelopeSnapshotResult" }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "API Token"
      }
    },
    "parameters": {
      "account_id": {
        "name": "account_id",
        "in": "path",
        "required": true,
        "schema": { "type": "string" },
        "description": "Account ID."
      },
      "cacheTTL": {
        "name": "cacheTTL",
        "in": "query",
        "required": false,
        "schema": { "type": "integer", "maximum": 86400 },
        "description": "Cache TTL (default 5s). Set to 0 to disable."
      }
    },
    "requestBodies": {
      "CommonContentBody": {
        "required": false,
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/CommonLoadControls" }
}
}
}
},
"schemas": {
"ApiError": {
"type": "object",
"properties": {
"code": { "type": "integer" },
"message": { "type": "string" }
}
},
"ApiEnvelopeBase": {
"type": "object",
"properties": {
"status": { "type": "boolean" },
"errors": {
"type": "array",
"items": { "$ref": "#/components/schemas/ApiError" }
          }
        }
      },
      "ApiEnvelopeStringResult": {
        "allOf": [
          { "$ref": "#/components/schemas/ApiEnvelopeBase" },
{
"type": "object",
"properties": { "result": { "type": "string" } }
}
]
},
"ApiEnvelopeObjectResult": {
"allOf": [
{ "$ref": "#/components/schemas/ApiEnvelopeBase" },
{
"type": "object",
"properties": { "result": { "type": "object" } }
}
]
},
"ApiEnvelopeStringArrayResult": {
"allOf": [
{ "$ref": "#/components/schemas/ApiEnvelopeBase" },
{
"type": "object",
"properties": {
"result": {
"type": "array",
"items": { "type": "string" }
}
}
}
]
},
"ApiEnvelopeStatusOnly": {
"allOf": [
{ "$ref": "#/components/schemas/ApiEnvelopeBase" }
]
},
"ApiEnvelopeSnapshotResult": {
"allOf": [
{ "$ref": "#/components/schemas/ApiEnvelopeBase" },
          {
            "type": "object",
            "properties": {
              "result": {
                "type": "object",
                "properties": {
                  "content": { "type": "string", "description": "HTML content" },
                  "screenshot": {
                    "type": "string",
                    "description": "Base64 encoded image"
                  }
                },
                "required": ["content", "screenshot"]
              }
            }
          }
        ]
      },
      "ScrapeResult": {
        "type": "object",
        "properties": {
          "attributes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "value": { "type": "string" }
              }
            }
          },
          "height": { "type": "number" },
          "html": { "type": "string" },
          "left": { "type": "number" },
          "text": { "type": "string" },
          "top": { "type": "number" },
          "width": { "type": "number" }
        }
      },
      "ApiEnvelopeScrapeArrayResult": {
        "allOf": [
          { "$ref": "#/components/schemas/ApiEnvelopeBase" },
{
"type": "object",
"properties": {
"result": {
"type": "array",
"items": {
"type": "object",
"properties": {
"selector": { "type": "string" },
"results": { "$ref": "#/components/schemas/ScrapeResult" }
},
"required": ["selector", "results"]
}
}
}
}
]
},
"CommonLoadControls": {
"type": "object",
"properties": {
"actionTimeout": { "type": "integer", "maximum": 300000 },
"addScriptTag": {
"type": "array",
"items": { "type": "object" }
},
"addStyleTag": {
"type": "array",
"items": { "type": "object" }
},
"allowRequestPattern": {
"type": "array",
"items": { "type": "string" }
},
"allowResourceTypes": {
"type": "array",
"items": { "type": "string" },
"description": "document, stylesheet, image, script, etc."
},
"authenticate": { "type": "object" },
"bestAttempt": { "type": "boolean" },
"cookies": {
"type": "array",
"items": { "type": "object" }
},
"emulateMediaType": { "type": "string" },
"gotoOptions": { "type": "object" },
"html": { "type": "string", "minLength": 1, "description": "Either html or url must be set." },
"rejectRequestPattern": {
"type": "array",
"items": { "type": "string" }
},
"rejectResourceTypes": {
"type": "array",
"items": { "type": "string" }
},
"setExtraHTTPHeaders": {
"type": "object",
"additionalProperties": { "type": "string" }
},
"setJavaScriptEnabled": { "type": "boolean" },
"url": { "type": "string", "format": "uri" },
"userAgent": { "type": "string" },
"viewport": { "type": "object" },
"waitForSelector": { "type": "object" },
"waitForTimeout": { "type": "integer", "maximum": 60000 }
}
}
}
}
}

Source pages
• Core section index and method summaries: Content (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/content/), Json (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/json/), Links (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/links/), Markdown (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/markdown/), PDF (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/pdf/), Scrape (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/scrape/), Screenshot (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/screenshot/), Snapshot (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/snapshot/).
• Detailed parameter pages: Get HTML content. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/content/methods/create/), Get json. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/json/methods/create/), Get Links. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/links/methods/create/), Get markdown. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/markdown/methods/create/), Get PDF. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/pdf/methods/create/), Scrape elements. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/scrape/methods/create/), Get screenshot. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/screenshot/methods/create/), Get HTML content and screenshot. (https://developers.cloudflare.com/api/node/resources/browser_rendering/subresources/snapshot/methods/create/)

===== Additional context ======

---

pcx_content_type: how-to
title: Generate PDFs Using HTML and CSS
sidebar:
order: 1

---

import { Aside, WranglerConfig, PackageManagers, Render } from "~/components";

As seen in [this Workers bindings guide](/browser-rendering/workers-bindings/screenshots/), Browser Rendering can be used to generate screenshots for any given URL. Alongside screenshots, you can also generate full PDF documents for a given webpage, and can also provide the webpage markup and style ourselves.

You can generate PDFs with Browser Rendering in two ways:

- **[REST API](/browser-rendering/rest-api/)**: Use the the [/pdf endpoint](/browser-rendering/rest-api/pdf-endpoint/). This is ideal if you don't need to customize rendering behavior.
- **[Workers Bindings](/browser-rendering/workers-bindings/)**: Use [Puppeteer](/browser-rendering/platform/puppeteer/) or [Playwright](/browser-rendering/platform/playwright/) with Workers Bindings for additional control and customization.

Choose the method that best fits your use case.

The following example shows you how to generate a PDF using [Puppeteer](/browser-rendering/platform/puppeteer/).

## Prerequisites

1. Use the `create-cloudflare` CLI to generate a new Hello World Cloudflare Worker script:

<PackageManagers type="create" pkg="cloudflare@latest" args="browser-worker" />

2. Install `@cloudflare/puppeteer`, which allows you to control the Browser Rendering instance:

<PackageManagers pkg="@cloudflare/puppeteer" dev />

3. Add your Browser Rendering binding to your new Wrangler configuration:

<WranglerConfig>

```toml title="wrangler.toml"
browser = { binding = "BROWSER" }
```

</WranglerConfig>

<Render file="remote-binding-note" product="workers" />

4. Replace the contents of `src/index.ts` (or `src/index.js` for JavaScript projects) with the following skeleton script:

```ts
import puppeteer from "@cloudflare/puppeteer";

const generateDocument = (name: string) => {};

export default {
  async fetch(request, env) {
    const { searchParams } = new URL(request.url);
    let name = searchParams.get("name");

    if (!name) {
      return new Response("Please provide a name using the ?name= parameter");
    }

    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Step 1: Define HTML and CSS
    const document = generateDocument(name);

    // Step 2: Send HTML and CSS to our browser
    await page.setContent(document);

    // Step 3: Generate and return PDF

    return new Response();
  },
};
```

## 1. Define HTML and CSS

Rather than using Browser Rendering to navigate to a user-provided URL, manually generate a webpage, then provide that webpage to the Browser Rendering instance. This allows you to render any design you want.

:::note
You can generate your HTML or CSS using any method you like. This example uses string interpolation, but the method is also fully compatible with web frameworks capable of rendering HTML on Workers such as React, Remix, and Vue.
:::

For this example, we are going to take in user-provided content (via a '?name=' parameter), and have that name output in the final PDF document.

To start, fill out your `generateDocument` function with the following:

```ts
const generateDocument = (name: string) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      html,
      body,
      #container {
        width: 100%;
        height: 100%;
        margin: 0;
      }
      body {
        font-family: Baskerville, Georgia, Times, serif;
        background-color: #f7f1dc;
      }
      strong {
        color: #5c594f;
        font-size: 128px;
        margin: 32px 0 48px 0;
      }
      em {
        font-size: 24px;
      }
      #container {
        flex-direction: column;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
    </style>
  </head>

  <body>
    <div id="container">
      <em>This is to certify that</em>
      <strong>${name}</strong>
      <em>has rendered a PDF using Cloudflare Workers</em>
    </div>
  </body>
</html>
`;
};
```

This example HTML document should render a beige background imitating a certificate showing that the user-provided name has successfully rendered a PDF using Cloudflare Workers.

:::note
It is usually best to avoid directly interpolating user-provided content into an image or PDF renderer in production applications. To render contents like an invoice, it would be best to validate the data input and fetch the data yourself using tools like [D1](/d1/) or [Workers KV](/kv/).
:::

## 2. Load HTML and CSS Into Browser

Now that you have your fully styled HTML document, you can take the contents and send it to your browser instance. Create an empty page to store this document as follows:

```ts
const browser = await puppeteer.launch(env.BROWSER);
const page = await browser.newPage();
```

The [`page.setContent()`](https://github.com/cloudflare/puppeteer/blob/main/docs/api/puppeteer.page.setcontent.md) function can then be used to set the page's HTML contents from a string, so you can pass in your created document directly like so:

```ts
await page.setContent(document);
```

## 3. Generate and Return PDF

With your Browser Rendering instance now rendering your provided HTML and CSS, you can use the [`page.pdf()`](https://github.com/cloudflare/puppeteer/blob/main/docs/api/puppeteer.page.pdf.md) command to generate a PDF file and return it to the client.

```ts
let pdf = page.pdf({ printBackground: true });
```

The `page.pdf()` call supports a [number of options](https://github.com/cloudflare/puppeteer/blob/main/docs/api/puppeteer.pdfoptions.md), including setting the dimensions of the generated PDF to a specific paper size, setting specific margins, and allowing fully-transparent backgrounds. For now, you are only overriding the `printBackground` option to allow your `body` background styles to show up.

Now that you have your PDF data, return it to the client in the `Response` with an `application/pdf` content type:

```ts
return new Response(pdf, {
  headers: {
    "content-type": "application/pdf",
  },
});
```

## Conclusion

The full Worker script now looks as follows:

```ts
import puppeteer from "@cloudflare/puppeteer";

const generateDocument = (name: string) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
	  html, body, #container {
		width: 100%;
	    height: 100%;
		margin: 0;
	  }
      body {
        font-family: Baskerville, Georgia, Times, serif;
        background-color: #f7f1dc;
      }
      strong {
        color: #5c594f;
		font-size: 128px;
		margin: 32px 0 48px 0;
      }
	  em {
		font-size: 24px;
	  }
      #container {
		flex-direction: column;
        display: flex;
        align-items: center;
        justify-content: center;
		text-align: center
      }
    </style>
  </head>

  <body>
    <div id="container">
		<em>This is to certify that</em>
		<strong>${name}</strong>
		<em>has rendered a PDF using Cloudflare Workers</em>
	</div>
  </body>
</html>
`;
};

export default {
  async fetch(request, env) {
    const { searchParams } = new URL(request.url);
    let name = searchParams.get("name");

    if (!name) {
      return new Response("Please provide a name using the ?name= parameter");
    }

    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Step 1: Define HTML and CSS
    const document = generateDocument(name);

    // // Step 2: Send HTML and CSS to our browser
    await page.setContent(document);

    // // Step 3: Generate and return PDF
    const pdf = await page.pdf({ printBackground: true });

    // Close browser since we no longer need it
    await browser.close();

    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
      },
    });
  },
};
```

You can run this script to test it via:

<PackageManagers type="exec" pkg="wrangler" args="dev" />

With your script now running, you can pass in a `?name` parameter to the local URL (such as `http://localhost:8787/?name=Harley`) and should see the following:

![A screenshot of a generated PDF, with the author's name shown in a mock certificate.](~/assets/images/browser-rendering/pdf-generation.png).

---

Dynamically generating PDF documents solves a number of common use-cases, from invoicing customers to archiving documents to creating dynamic certificates (as seen in the simple example here).

=== AI Control ===

---

title: Use browser rendering with AI
tags:

- AI
- LLM
  sidebar:
  order: 2

---

import { Aside, WranglerConfig } from "~/components";

The ability to browse websites can be crucial when building workflows with AI. Here, we provide an example where we use Browser Rendering to visit
`https://labs.apnic.net/` and then, using a machine learning model available in [Workers AI](/workers-ai/), extract the first post as JSON with a specified schema.

## Prerequisites

1. Use the `create-cloudflare` CLI to generate a new Hello World Cloudflare Worker script:

```sh
npm create cloudflare@latest -- browser-worker
```

2. Install `@cloudflare/puppeteer`, which allows you to control the Browser Rendering instance:

```sh
npm i @cloudflare/puppeteer
```

2. Install `zod` so we can define our output format and `zod-to-json-schema` so we can convert it into a JSON schema format:

```sh
npm i zod
npm i zod-to-json-schema
```

3. Activate the nodejs compatibility flag and add your Browser Rendering binding to your new Wrangler configuration:

<WranglerConfig>
```toml
compatibility_flags = [ "nodejs_compat" ]
```
</WranglerConfig>

<WranglerConfig>
```toml
[browser]
binding = "MY_BROWSER"
```
</WranglerConfig>

4.  In order to use [Workers AI](/workers-ai/), you need to get your [Account ID and API token](/workers-ai/get-started/rest-api/#1-get-api-token-and-account-id).
    Once you have those, create a [`.dev.vars`](/workers/configuration/environment-variables/#add-environment-variables-via-wrangler) file and set them there:

```
ACCOUNT_ID=
API_TOKEN=
```

We use `.dev.vars` here since it's only for local development, otherwise you'd use [Secrets](/workers/configuration/secrets/).

## Load the page using Browser Rendering

In the code below, we launch a browser using `await puppeteer.launch(env.MY_BROWSER)`, extract the rendered text and close the browser.
Then, with the user prompt, the desired output schema and the rendered text, prepare a prompt to send to the LLM.

Replace the contents of `src/index.ts` with the following skeleton script:

```ts
import { z } from "zod";
import puppeteer from "@cloudflare/puppeteer";
import zodToJsonSchema from "zod-to-json-schema";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname != "/") {
      return new Response("Not found");
    }

    // Your prompt and site to scrape
    const userPrompt = "Extract the first post only.";
    const targetUrl = "https://labs.apnic.net/";

    // Launch browser
    const browser = await puppeteer.launch(env.MY_BROWSER);
    const page = await browser.newPage();
    await page.goto(targetUrl);

    // Get website text
    const renderedText = await page.evaluate(() => {
      // @ts-ignore js code to run in the browser context
      const body = document.querySelector("body");
      return body ? body.innerText : "";
    });
    // Close browser since we no longer need it
    await browser.close();

    // define your desired json schema
    const outputSchema = zodToJsonSchema(
      z.object({ title: z.string(), url: z.string(), date: z.string() })
    );

    // Example prompt
    const prompt = `
    You are a sophisticated web scraper. You are given the user data extraction goal and the JSON schema for the output data format.
    Your task is to extract the requested information from the text and output it in the specified JSON schema format:

        ${JSON.stringify(outputSchema)}

    DO NOT include anything else besides the JSON output, no markdown, no plaintext, just JSON.

    User Data Extraction Goal: ${userPrompt}

    Text extracted from the webpage: ${renderedText}`;

    // TODO call llm
    //const result = await getLLMResult(env, prompt, outputSchema);
    //return Response.json(result);
  },
} satisfies ExportedHandler<Env>;
```

## Call an LLM

Having the webpage text, the user's goal and output schema, we can now use an LLM to transform it to JSON according to the user's request.
The example below uses `@hf/thebloke/deepseek-coder-6.7b-instruct-awq` but other [models](/workers-ai/models/) or services like OpenAI, could be used with minimal changes:

````ts
async function getLLMResult(env, prompt: string, schema?: any) {
  const model = "@hf/thebloke/deepseek-coder-6.7b-instruct-awq";
  const requestBody = {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };
  const aiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/ai/run/${model}`;

  const response = await fetch(aiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.API_TOKEN}`,
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    console.log(JSON.stringify(await response.text(), null, 2));
    throw new Error(`LLM call failed ${aiUrl} ${response.status}`);
  }

  // process response
  const data = await response.json();
  const text = data.result.response || "";
  const value = (text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [
    null,
    text,
  ])[1];
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error(`${e} . Response: ${value}`);
  }
}
````

If you want to use Browser Rendering with OpenAI instead you'd just need to change the `aiUrl` endpoint and `requestBody` (or check out the [llm-scraper-worker](https://www.npmjs.com/package/llm-scraper-worker) package).

## Conclusion

The full Worker script now looks as follows:

````ts
import { z } from "zod";
import puppeteer from "@cloudflare/puppeteer";
import zodToJsonSchema from "zod-to-json-schema";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname != "/") {
      return new Response("Not found");
    }

    // Your prompt and site to scrape
    const userPrompt = "Extract the first post only.";
    const targetUrl = "https://labs.apnic.net/";

    // Launch browser
    const browser = await puppeteer.launch(env.MY_BROWSER);
    const page = await browser.newPage();
    await page.goto(targetUrl);

    // Get website text
    const renderedText = await page.evaluate(() => {
      // @ts-ignore js code to run in the browser context
      const body = document.querySelector("body");
      return body ? body.innerText : "";
    });
    // Close browser since we no longer need it
    await browser.close();

    // define your desired json schema
    const outputSchema = zodToJsonSchema(
      z.object({ title: z.string(), url: z.string(), date: z.string() })
    );

    // Example prompt
    const prompt = `
    You are a sophisticated web scraper. You are given the user data extraction goal and the JSON schema for the output data format.
    Your task is to extract the requested information from the text and output it in the specified JSON schema format:

        ${JSON.stringify(outputSchema)}

    DO NOT include anything else besides the JSON output, no markdown, no plaintext, just JSON.

    User Data Extraction Goal: ${userPrompt}

    Text extracted from the webpage: ${renderedText}`;

    // call llm
    const result = await getLLMResult(env, prompt, outputSchema);
    return Response.json(result);
  },
} satisfies ExportedHandler<Env>;

async function getLLMResult(env, prompt: string, schema?: any) {
  const model = "@hf/thebloke/deepseek-coder-6.7b-instruct-awq";
  const requestBody = {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };
  const aiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/ai/run/${model}`;

  const response = await fetch(aiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.API_TOKEN}`,
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    console.log(JSON.stringify(await response.text(), null, 2));
    throw new Error(`LLM call failed ${aiUrl} ${response.status}`);
  }

  // process response
  const data = (await response.json()) as { result: { response: string } };
  const text = data.result.response || "";
  const value = (text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [
    null,
    text,
  ])[1];
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error(`${e} . Response: ${value}`);
  }
}
````

You can run this script to test it via:

```sh
npx wrangler dev
```

With your script now running, you can go to `http://localhost:8787/` and should see something like the following:

```json
{
  "title": "IP Addresses in 2024",
  "url": "http://example.com/ip-addresses-in-2024",
  "date": "11 Jan 2025"
}
```

For more complex websites or prompts, you might need a better model. Check out the latest models in [Workers AI](/workers-ai/models/).

=== queues ===

---

reviewed: 2024-08-06
difficulty: Intermediate
title: Build a web crawler with Queues and Browser Rendering
summary: Example of how to use Queues and Browser Rendering to power a web crawler.
pcx_content_type: tutorial
products: [workers, queues, browser-rendering]
tags:

- TypeScript
  sidebar:
  order: 1002
  head:
- tag: title
  content: Cloudflare Queues - Queues & Browser Rendering
  description: Example of how to use Queues and Browser Rendering to power a web crawler.

---

import { Render, PackageManagers, WranglerConfig } from "~/components";

This tutorial explains how to build and deploy a web crawler with Queues, [Browser Rendering](/browser-rendering/), and [Puppeteer](/browser-rendering/platform/puppeteer/).

Puppeteer is a high-level library used to automate interactions with Chrome/Chromium browsers. On each submitted page, the crawler will find the number of links to `cloudflare.com` and take a screenshot of the site, saving results to [Workers KV](/kv/).

You can use Puppeteer to request all images on a page, save the colors used on a site, and more.

## Prerequisites

<Render file="prereqs" product="workers" />

## 1. Create new Workers application

To get started, create a Worker application using the [`create-cloudflare` CLI](https://github.com/cloudflare/workers-sdk/tree/main/packages/create-cloudflare). Open a terminal window and run the following command:

<PackageManagers
type="create"
pkg="cloudflare@latest"
args={"queues-web-crawler"}
/>

<Render
file="c3-post-run-steps"
product="workers"
params={{
		category: "hello-world",
		type: "Worker only",
		lang: "TypeScript",
	}}
/>

Then, move into your newly created directory:

```sh
cd queues-web-crawler
```

## 2. Create KV namespace

We need to create a KV store. This can be done through the Cloudflare dashboard or the Wrangler CLI. For this tutorial, we will use the Wrangler CLI.

<PackageManagers
	type="exec"
	pkg="wrangler"
	args="kv namespace create crawler_links"
/>

<PackageManagers
	type="exec"
	pkg="wrangler"
	args="kv namespace create crawler_screenshots"
/>

```sh output
🌀 Creating namespace with title "web-crawler-crawler-links"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "crawler_links"
id = "<GENERATED_NAMESPACE_ID>"

🌀 Creating namespace with title "web-crawler-crawler-screenshots"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
[[kv_namespaces]]
binding = "crawler_screenshots"
id = "<GENERATED_NAMESPACE_ID>"
```

### Add KV bindings to the [Wrangler configuration file](/workers/wrangler/configuration/)

Then, in your Wrangler file, add the following with the values generated in the terminal:

<WranglerConfig>

```toml
kv_namespaces = [
  { binding = "CRAWLER_SCREENSHOTS_KV", id = "<GENERATED_NAMESPACE_ID>" },
  { binding = "CRAWLER_LINKS_KV", id = "<GENERATED_NAMESPACE_ID>" }
]
```

</WranglerConfig>

## 3. Set up Browser Rendering

Now, you need to set up your Worker for Browser Rendering.

In your current directory, install Cloudflare’s [fork of Puppeteer](/browser-rendering/platform/puppeteer/) and also [robots-parser](https://www.npmjs.com/package/robots-parser):

<PackageManagers pkg="@cloudflare/puppeteer" dev />

<PackageManagers pkg="robots-parser" />

Then, add a Browser Rendering binding. Adding a Browser Rendering binding gives the Worker access to a headless Chromium instance you will control with Puppeteer.

<WranglerConfig>

```toml
browser = { binding = "CRAWLER_BROWSER" }
```

</WranglerConfig>

## 4. Set up a Queue

Now, we need to set up the Queue.

<PackageManagers
	type="exec"
	pkg="wrangler"
	args="queues create queues-web-crawler"
/>

```txt title="Output"
Creating queue queues-web-crawler.
Created queue queues-web-crawler.
```

### Add Queue bindings to wrangler.toml

Then, in your Wrangler file, add the following:

<WranglerConfig>

```toml
[[queues.consumers]]
queue = "queues-web-crawler"
max_batch_timeout = 60

[[queues.producers]]
queue = "queues-web-crawler"
binding = "CRAWLER_QUEUE"
```

</WranglerConfig>

Adding the `max_batch_timeout` of 60 seconds to the consumer queue is important because Browser Rendering has a limit of two new browsers per minute per account. This timeout waits up to a minute before collecting queue messages into a batch. The Worker will then remain under this browser invocation limit.

Your final Wrangler file should look similar to the one below.

<WranglerConfig>

```toml
#:schema node_modules/wrangler/config-schema.json
name = "web-crawler"
main = "src/index.ts"
compatibility_date = "2024-07-25"
compatibility_flags = ["nodejs_compat"]

kv_namespaces = [
  { binding = "CRAWLER_SCREENSHOTS_KV", id = "<GENERATED_NAMESPACE_ID>" },
  { binding = "CRAWLER_LINKS_KV", id = "<GENERATED_NAMESPACE_ID>" }
]

browser = { binding = "CRAWLER_BROWSER" }

[[queues.consumers]]
queue = "queues-web-crawler"
max_batch_timeout = 60

[[queues.producers]]
queue = "queues-web-crawler"
binding = "CRAWLER_QUEUE"
```

</WranglerConfig>

## 5. Add bindings to environment

Add the bindings to the environment interface in `src/index.ts`, so TypeScript correctly types the bindings. Type the queue as `Queue<any>`. The following step will show you how to change this type.

```ts
import { BrowserWorker } from "@cloudflare/puppeteer";

export interface Env {
  CRAWLER_QUEUE: Queue<any>;
  CRAWLER_SCREENSHOTS_KV: KVNamespace;
  CRAWLER_LINKS_KV: KVNamespace;
  CRAWLER_BROWSER: BrowserWorker;
}
```

## 6. Submit links to crawl

Add a `fetch()` handler to the Worker to submit links to crawl.

```ts
type Message = {
  url: string;
};

export interface Env {
  CRAWLER_QUEUE: Queue<Message>;
  // ... etc.
}

export default {
  async fetch(req, env): Promise<Response> {
    await env.CRAWLER_QUEUE.send({ url: await req.text() });
    return new Response("Success!");
  },
} satisfies ExportedHandler<Env>;
```

This will accept requests to any subpath and forwards the request's body to be crawled. It expects that the request body only contains a URL. In production, you should check that the request was a `POST` request and contains a well-formed URL in its body. This has been omitted for simplicity.

## 7. Crawl with Puppeteer

Add a `queue()` handler to the Worker to process the links you send.

```ts
import puppeteer from "@cloudflare/puppeteer";
import robotsParser from "robots-parser";

async queue(batch: MessageBatch<Message>, env: Env): Promise<void> {
  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch(env.CRAWLER_BROWSER);
  } catch {
    batch.retryAll();
	return;
  }

  for (const message of batch.messages) {
    const { url } = message.body;

    let isAllowed = true;
    try {
      const robotsTextPath = new URL(url).origin + "/robots.txt";
      const response = await fetch(robotsTextPath);

      const robots = robotsParser(robotsTextPath, await response.text());
      isAllowed = robots.isAllowed(url) ?? true; // respect robots.txt!
    } catch {}

    if (!isAllowed) {
      message.ack();
      continue;
    }

	// TODO: crawl!
    message.ack();
  }

  await browser.close();
},
```

This is a skeleton for the crawler. It launches the Puppeteer browser and iterates through the Queue's received messages. It fetches the site's `robots.txt` and uses `robots-parser` to check that this site allows crawling. If crawling is not allowed, the message is `ack`'ed, removing it from the Queue. If crawling is allowed, you can continue to crawl the site.

The `puppeteer.launch()` is wrapped in a `try...catch` to allow the whole batch to be retried if the browser launch fails. The browser launch may fail due to going over the limit for number of browsers per account.

```ts
type Result = {
  numCloudflareLinks: number;
  screenshot: ArrayBuffer;
};

const crawlPage = async (url: string): Promise<Result> => {
  const page = await (browser as puppeteer.Browser).newPage();

  await page.goto(url, {
    waitUntil: "load",
  });

  const numCloudflareLinks = await page.$$eval("a", (links) => {
    links = links.filter((link) => {
      try {
        return new URL(link.href).hostname.includes("cloudflare.com");
      } catch {
        return false;
      }
    });
    return links.length;
  });

  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  return {
    numCloudflareLinks,
    screenshot: ((await page.screenshot({ fullPage: true })) as Buffer).buffer,
  };
};
```

This helper function opens a new page in Puppeteer and navigates to the provided URL. `numCloudflareLinks` uses Puppeteer's `$$eval` (equivalent to `document.querySelectorAll`) to find the number of links to a `cloudflare.com` page. Checking if the link's `href` is to a `cloudflare.com` page is wrapped in a `try...catch` to handle cases where `href`s may not be URLs.

Then, the function sets the browser viewport size and takes a screenshot of the full page. The screenshot is returned as a `Buffer` so it can be converted to an `ArrayBuffer` and written to KV.

To enable recursively crawling links, add a snippet after checking the number of Cloudflare links to send messages recursively from the queue consumer to the queue itself. Recursing too deep, as is possible with crawling, will cause a Durable Object `Subrequest depth limit exceeded.` error. If one occurs, it is caught, but the links are not retried.

```ts null {3-14}
// const numCloudflareLinks = await page.$$eval("a", (links) => { ...

await page.$$eval("a", async (links) => {
  const urls: MessageSendRequest<Message>[] = links.map((link) => {
    return {
      body: {
        url: link.href,
      },
    };
  });
  try {
    await env.CRAWLER_QUEUE.sendBatch(urls);
  } catch {} // do nothing, likely hit subrequest limit
});

// await page.setViewport({ ...
```

Then, in the `queue` handler, call `crawlPage` on the URL.

```ts null {8-23}
// in the `queue` handler:
// ...
if (!isAllowed) {
  message.ack();
  continue;
}

try {
  const { numCloudflareLinks, screenshot } = await crawlPage(url);
  const timestamp = new Date().getTime();
  const resultKey = `${encodeURIComponent(url)}-${timestamp}`;
  await env.CRAWLER_LINKS_KV.put(resultKey, numCloudflareLinks.toString(), {
    metadata: { date: timestamp },
  });
  await env.CRAWLER_SCREENSHOTS_KV.put(resultKey, screenshot, {
    metadata: { date: timestamp },
  });
  message.ack();
} catch {
  message.retry();
}

// ...
```

This snippet saves the results from `crawlPage` into the appropriate KV namespaces. If an unexpected error occurred, the URL will be retried and resent to the queue again.

Saving the timestamp of the crawl in KV helps you avoid crawling too frequently.

Add a snippet before checking `robots.txt` to check KV for a crawl within the last hour. This lists all KV keys beginning with the same URL (crawls of the same page), and check if any crawls have been done within the last hour. If any crawls have been done within the last hour, the message is `ack`'ed and not retried.

```ts null {12-23}
type KeyMetadata = {
  date: number;
};

// in the `queue` handler:
// ...
for (const message of batch.messages) {
  const sameUrlCrawls = await env.CRAWLER_LINKS_KV.list({
    prefix: `${encodeURIComponent(url)}`,
  });

  let shouldSkip = false;
  for (const key of sameUrlCrawls.keys) {
    if (timestamp - (key.metadata as KeyMetadata)?.date < 60 * 60 * 1000) {
      // if crawled in last hour, skip
      message.ack();
      shouldSkip = true;
      break;
    }
  }
  if (shouldSkip) {
    continue;
  }

  let isAllowed = true;
  // ...
```

The final script is included below.

```ts
import puppeteer, { BrowserWorker } from "@cloudflare/puppeteer";
import robotsParser from "robots-parser";

type Message = {
  url: string;
};

export interface Env {
  CRAWLER_QUEUE: Queue<Message>;
  CRAWLER_SCREENSHOTS_KV: KVNamespace;
  CRAWLER_LINKS_KV: KVNamespace;
  CRAWLER_BROWSER: BrowserWorker;
}

type Result = {
  numCloudflareLinks: number;
  screenshot: ArrayBuffer;
};

type KeyMetadata = {
  date: number;
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // util endpoint for testing purposes
    await env.CRAWLER_QUEUE.send({ url: await req.text() });
    return new Response("Success!");
  },
  async queue(batch: MessageBatch<Message>, env: Env): Promise<void> {
    const crawlPage = async (url: string): Promise<Result> => {
      const page = await (browser as puppeteer.Browser).newPage();

      await page.goto(url, {
        waitUntil: "load",
      });

      const numCloudflareLinks = await page.$$eval("a", (links) => {
        links = links.filter((link) => {
          try {
            return new URL(link.href).hostname.includes("cloudflare.com");
          } catch {
            return false;
          }
        });
        return links.length;
      });

      // to crawl recursively - uncomment this!
      /*await page.$$eval("a", async (links) => {
        const urls: MessageSendRequest<Message>[] = links.map((link) => {
          return {
            body: {
              url: link.href,
            },
          };
        });
        try {
          await env.CRAWLER_QUEUE.sendBatch(urls);
        } catch {} // do nothing, might've hit subrequest limit
      });*/

      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      return {
        numCloudflareLinks,
        screenshot: ((await page.screenshot({ fullPage: true })) as Buffer)
          .buffer,
      };
    };

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch(env.CRAWLER_BROWSER);
    } catch {
      batch.retryAll();
      return;
    }

    for (const message of batch.messages) {
      const { url } = message.body;
      const timestamp = new Date().getTime();
      const resultKey = `${encodeURIComponent(url)}-${timestamp}`;

      const sameUrlCrawls = await env.CRAWLER_LINKS_KV.list({
        prefix: `${encodeURIComponent(url)}`,
      });

      let shouldSkip = false;
      for (const key of sameUrlCrawls.keys) {
        if (timestamp - (key.metadata as KeyMetadata)?.date < 60 * 60 * 1000) {
          // if crawled in last hour, skip
          message.ack();
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) {
        continue;
      }

      let isAllowed = true;
      try {
        const robotsTextPath = new URL(url).origin + "/robots.txt";
        const response = await fetch(robotsTextPath);

        const robots = robotsParser(robotsTextPath, await response.text());
        isAllowed = robots.isAllowed(url) ?? true; // respect robots.txt!
      } catch {}

      if (!isAllowed) {
        message.ack();
        continue;
      }

      try {
        const { numCloudflareLinks, screenshot } = await crawlPage(url);
        await env.CRAWLER_LINKS_KV.put(
          resultKey,
          numCloudflareLinks.toString(),
          { metadata: { date: timestamp } }
        );
        await env.CRAWLER_SCREENSHOTS_KV.put(resultKey, screenshot, {
          metadata: { date: timestamp },
        });
        message.ack();
      } catch {
        message.retry();
      }
    }

    await browser.close();
  },
};
```

## 8. Deploy your Worker

To deploy your Worker, run the following command:

<PackageManagers type="exec" pkg="wrangler" args="deploy" />

You have successfully created a Worker which can submit URLs to a queue for crawling and save results to Workers KV.

To test your Worker, you could use the following cURL request to take a screenshot of this documentation page.

```bash title="Test with a cURL request"
curl <YOUR_WORKER_URL> \
  -H "Content-Type: application/json" \
  -d 'https://developers.cloudflare.com/queues/tutorials/web-crawler-with-browser-rendering/'

```

Refer to the [GitHub repository for the complete tutorial](https://github.com/cloudflare/queues-web-crawler), including a front end deployed with Pages to submit URLs and view crawler results.

## Related resources

- [How Queues works](/queues/reference/how-queues-works/)
- [Queues Batching and Retries](/queues/configuration/batching-retries/)
- [Browser Rendering](/browser-rendering/)
- [Puppeteer Examples](https://github.com/puppeteer/puppeteer/tree/main/examples)
