
interface InstagramPost {
  type: "post" | "reel";
  shortcode: string;
  originalUrl: string;
}

interface InstagramMetadata {
  title: string;
  description: string;
  image: string | null;
  source: string;
}

interface InstagramEmbedResponse {
  html?: string;
  type?: string;
  provider_name?: string;
  width?: number;
}

function resolveInstagramUrl(input: string): InstagramPost | null {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const allowedHosts = [
    "instagram.com",
    "www.instagram.com",
    "m.instagram.com",
  ];

  if (!["https:", "http:"].includes(url.protocol)) {
    return null;
  }

  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(
    /^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?$/
  );

  if (!match) {
    return null;
  }

  const [, pathType, shortcode] = match;

  return {
    type: pathType === "reel" || pathType === "reels" ? "reel" : "post",
    shortcode,
    originalUrl: `https://www.instagram.com/${pathType}/${shortcode}/`,
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getMeta(html: string, property: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    const regex =
      /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(tag)) !== null) {
      attrs[match[1].toLowerCase()] =
        match[2] ?? match[3] ?? match[4] ?? "";
    }

    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();

    if (key === property.toLowerCase() && attrs.content) {
      return decodeHtml(attrs.content);
    }
  }

  return null;
}

async function fetchInstagramMetadata(
  post: InstagramPost
): Promise<InstagramMetadata> {
  const response = await fetch(post.originalUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; InstaFix/0.1)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Instagram respondeu com HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("O Instagram não retornou HTML.");
  }

  const html = (await response.text()).slice(0, 2_000_000);
  const title = getMeta(html, "og:title") ?? "Publicação do Instagram";
  const description =
    getMeta(html, "og:description") ?? "Veja esta publicação no Instagram.";

  const imageValue = getMeta(html, "og:image");
  let image: string | null = null;

  if (imageValue) {
    try {
      const parsedImage = new URL(imageValue, post.originalUrl);

      if (parsedImage.protocol === "https:") {
        image = parsedImage.href;
      }
    } catch {
      image = null;
    }
  }

  return {
    title,
    description,
    image,
    source: post.originalUrl,
  };
}

async function fetchInstagramEmbed(post: InstagramPost): Promise<string> {
  const endpoint = new URL(
    "https://graph.facebook.com/v26.0/instagram_oembed"
  );

  endpoint.searchParams.set("url", post.originalUrl);
  endpoint.searchParams.set("omitscript", "true");
  endpoint.searchParams.set("maxwidth", "540");

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `A API de incorporação respondeu com HTTP ${response.status}.`
    );
  }

  const data = (await response.json()) as InstagramEmbedResponse;

  if (
    typeof data.html !== "string" ||
    !data.html.includes("instagram-media")
  ) {
    throw new Error("A Meta não retornou um embed válido.");
  }

  return data.html;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/g, (char) => entities[char]);
}

function renderHome(): Response {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#09090b">
  <title>InstaFix — Instagram, melhor compartilhado</title>
  <meta name="description" content="Uma experiência melhor para compartilhar posts e Reels do Instagram.">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      padding: 24px; background: #09090b; color: #fafafa;
      font-family: system-ui, -apple-system, sans-serif;
    }
    main { width: 100%; max-width: 720px; }
    .brand { font-size: 14px; color: #a1a1aa; letter-spacing: .08em; }
    h1 { font-size: clamp(38px, 8vw, 64px); line-height: 1.12; letter-spacing: -.06em; margin: 24px 0 12px; }
    p { color: #a1a1aa; line-height: 1.7; }
    form { display: flex; gap: 10px; margin-top: 28px; }
    input {
      flex: 1; min-width: 0; padding: 15px; border: 1px solid #27272a;
      border-radius: 10px; background: #18181b; color: white; font-size: 15px;
    }
    button {
      padding: 15px 20px; border: 0; border-radius: 10px;
      background: #fafafa; color: #09090b; font-weight: 650; cursor: pointer;
    }
    button:disabled { opacity: .6; cursor: wait; }
    #result { margin-top: 24px; overflow-wrap: anywhere; }
    #result a { color: #fafafa; }
    .preview {
      display: flex; gap: 16px; margin: 16px 0; padding: 16px;
      border: 1px solid #27272a; border-radius: 12px; background: #111113;
    }
    .preview img { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; }
    .preview-content { min-width: 0; }
    .preview-content p:first-child { color: #fafafa; font-weight: 600; }
    .error { color: #fca5a5; }
    @media (max-width: 480px) {
      form, .preview { flex-direction: column; }
      .preview img { width: 100%; height: auto; max-height: 280px; }
    }
  </style>
</head>
<body>
  <main>
    <div class="brand">INSTAFIX / OPEN SOURCE</div>
    <h1>Instagram, melhor compartilhado.</h1>
    <p>Uma experiência mais simples para compartilhar links de posts e Reels.</p>
    <form id="form">
      <input id="url" type="url" placeholder="Cole um link do Instagram..." required>
      <button id="submit" type="submit">Resolver link</button>
    </form>
    <div id="result" aria-live="polite"></div>
  </main>
  <script>
    const form = document.querySelector("#form");
    const input = document.querySelector("#url");
    const button = document.querySelector("#submit");
    const result = document.querySelector("#result");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.replaceChildren();
      result.textContent = "Verificando publicação...";
      button.disabled = true;

      try {
        const response = await fetch(
          "/api/resolve?url=" + encodeURIComponent(input.value)
        );
        const data = await response.json();
        result.replaceChildren();

        if (!response.ok) {
          result.textContent = data.error || "Link inválido.";
          result.className = "error";
          return;
        }

        result.className = "";

        const heading = document.createElement("p");
        heading.textContent = "Tipo: " + data.type + " · Código: " + data.shortcode;
        result.appendChild(heading);

        if (data.metadata) {
          const preview = document.createElement("div");
          preview.className = "preview";

          if (data.metadata.image) {
            const img = document.createElement("img");
            img.src = data.metadata.image;
            img.alt = "Imagem da publicação";
            img.loading = "lazy";
            preview.appendChild(img);
          }

          const content = document.createElement("div");
          content.className = "preview-content";

          const title = document.createElement("p");
          title.textContent = data.metadata.title;

          const description = document.createElement("p");
          description.textContent = data.metadata.description;

          content.append(title, description);

          const shareLink = document.createElement("a");
          shareLink.href = data.sharePath;
          shareLink.textContent = "Assistir ou compartilhar no InstaFix";
          content.appendChild(shareLink);

          preview.appendChild(content);
          result.appendChild(preview);
        } else {
          const warning = document.createElement("p");
          warning.textContent = data.message || "Metadados indisponíveis.";
          result.appendChild(warning);
        }

        const originalLink = document.createElement("a");
        originalLink.href = data.originalUrl;
        originalLink.target = "_blank";
        originalLink.rel = "noopener noreferrer";
        originalLink.textContent = "Abrir publicação original";
        result.append(document.createElement("br"), originalLink);
      } catch {
        result.textContent = "Erro ao comunicar com o InstaFix.";
        result.className = "error";
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function renderSharePage(post: InstagramPost, embedHtml: string): Response {
  // O HTML é fornecido pelo endpoint oficial de incorporação da Meta.
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#09090b">
  <title>InstaFix — Assistir publicação</title>
  <meta property="og:site_name" content="InstaFix">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Assista no InstaFix">
  <meta property="og:description" content="Veja esta publicação do Instagram.">
  <style>
    body { margin: 0; padding: 24px 16px; background: #09090b; color: #fafafa; font-family: system-ui, sans-serif; }
    main { max-width: 600px; margin: 0 auto; }
    .brand { color: #a1a1aa; letter-spacing: .08em; font-size: 13px; }
    .player { margin-top: 24px; }
    .instagram-media { margin: 0 auto !important; min-width: 0 !important; }
    a { color: #fafafa; }
  </style>
</head>
<body>
  <main>
    <p class="brand">INSTAFIX / OPEN SOURCE</p>
    <div class="player">${embedHtml}</div>
    <p><a href="${escapeHtml(post.originalUrl)}" target="_blank" rel="noopener noreferrer">Abrir no Instagram</a></p>
  </main>
  <script async src="https://www.instagram.com/embed.js"></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function renderUnavailable(post: InstagramPost): Response {
  const originalUrl = escapeHtml(post.originalUrl);

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>InstaFix — Vídeo indisponível</title>
  <style>
    body { background: #09090b; color: #fafafa; font-family: system-ui, sans-serif; padding: 32px; }
    a { color: #fafafa; }
  </style>
</head>
<body>
  <h1>Não foi possível carregar o vídeo</h1>
  <p>Esta publicação pode não permitir incorporação ou estar indisponível.</p>
  <a href="${originalUrl}" target="_blank" rel="noopener noreferrer">Assistir no Instagram</a>
</body>
</html>`,
    {
      status: 502,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return new Response("Método não permitido.", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }

    if (url.pathname === "/") {
      return renderHome();
    }

    if (url.pathname === "/api/resolve") {
      const input = url.searchParams.get("url");

      if (!input) {
        return Response.json(
          { error: "Informe um link do Instagram." },
          { status: 400 }
        );
      }

      const post = resolveInstagramUrl(input);

      if (!post) {
        return Response.json(
          { error: "Link inválido ou formato não suportado." },
          { status: 400 }
        );
      }

      let metadata: InstagramMetadata | null = null;
      let warning: string | null = null;

      try {
        metadata = await fetchInstagramMetadata(post);
      } catch (error) {
        warning =
          error instanceof Error ? error.message : "Metadados indisponíveis.";
      }

      return Response.json(
        {
          ...post,
          metadata,
          warning,
          sharePath: `/${post.type === "reel" ? "reel" : "p"}/${post.shortcode}/`,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const shareMatch = url.pathname.match(
      /^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/
    );

    if (shareMatch) {
      const [, type, shortcode] = shareMatch;

      const post: InstagramPost = {
        type,
        shortcode,
        originalUrl: `https://www.instagram.com/${type}/${shortcode}/`,
      };

      try {
        const embedHtml = await fetchInstagramEmbed(post);
        return renderSharePage(post, embedHtml);
      } catch {
        return renderUnavailable(post);
      }
    }

    return new Response("Não encontrado.", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
