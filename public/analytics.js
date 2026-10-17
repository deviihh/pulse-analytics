(function () {
  var script = document.currentScript;
  var siteKey = script && script.getAttribute("data-site");
  if (!siteKey) return;
  var endpoint = new URL(script.src).origin + "/api/collect";
  var lastPath = null;

  function post(payload) {
    var body = JSON.stringify(payload);
    // text/plain avoids a CORS preflight request
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }));
    } else {
      fetch(endpoint, { method: "POST", body: body, keepalive: true });
    }
  }

  function pageview() {
    var path = location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    var q = new URLSearchParams(location.search);
    post({
      key: siteKey,
      type: "pageview",
      path: path,
      referrer: document.referrer || null,
      utm_source: q.get("utm_source"),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
    });
  }

  window.pulse = {
    track: function (name) {
      if (typeof name !== "string" || !name) return;
      post({ key: siteKey, type: "custom", name: name, path: location.pathname });
    },
  };

  // single-page apps: track route changes too
  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    setTimeout(pageview, 0);
  };
  window.addEventListener("popstate", pageview);

  pageview();
})();