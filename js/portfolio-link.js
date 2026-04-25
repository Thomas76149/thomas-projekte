(() => {
  const raw = typeof window.PORTFOLIO_SITE_URL === "string" ? window.PORTFOLIO_SITE_URL.trim() : "";
  const nodes = document.querySelectorAll("[data-portfolio-link]");

  if (!raw) {
    const hint =
      "Noch keine Portfolio-URL: In js/site-config.js PORTFOLIO_SITE_URL eintragen (Deploy von thomas-portfolio).";
    nodes.forEach((a) => {
      a.title = hint;
    });
    return;
  }

  const base = raw.replace(/\/$/, "");
  nodes.forEach((a) => {
    a.href = `${base}/`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.removeAttribute("title");
  });
})();
