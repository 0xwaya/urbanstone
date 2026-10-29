"""Tiny JSON HTTP client (stdlib only). Tests replace `send` with a fake."""
import json
import urllib.error
import urllib.parse
import urllib.request


class ApiError(Exception):
    pass


def _real_send(method, url, params=None, json_body=None, headers=None):
    headers = dict(headers or {})
    data = None
    if method == "GET" and params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    elif json_body is not None:
        data = json.dumps(json_body).encode()
        headers["Content-Type"] = "application/json; charset=UTF-8"
    elif params:
        data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:500]
        raise ApiError(f"HTTP {e.code} {redact(url)}: {redact(body)}") from None


def redact(text):
    """Never let tokens leak into logs."""
    import re
    return re.sub(r"(access_token=)[^&\s\"]+", r"\1***", str(text))


send = _real_send
