# Recorta cada foto em volta dos alvos (zoom), mantendo a proporção 16:10. Gera fotos/<id>-z.jpg e zoom.json.
import json
from PIL import Image
A = json.load(open('alvos.json')); SEM = {'visao-geral', 'sem-acesso'}
VW, VH, ASP, MARGEM, MINW = 1440, 900, 1.6, 90, 760
out = {}
for k, a in A.items():
    cs = [c for c in a['alvos'] if c]
    if k in SEM or not cs:
        x0, y0, w, h = 0, 0, VW, VH
    else:
        x0 = min(c['x'] for c in cs) - MARGEM; y0 = min(c['y'] for c in cs) - MARGEM
        x1 = max(c['x'] + c['width'] for c in cs) + MARGEM; y1 = max(c['y'] + c['height'] for c in cs) + MARGEM
        w, h = max(x1 - x0, MINW), y1 - y0
        if w / h < ASP: w = h * ASP
        else: h = w / ASP
        if w > VW: w, h = VW, VH
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        x0 = min(max(cx - w / 2, 0), VW - w); y0 = min(max(cy - h / 2, 0), VH - h)
    im = Image.open('fotos/%s.jpg' % k)
    s = im.width / VW
    im.crop((round(x0 * s), round(y0 * s), round((x0 + w) * s), round((y0 + h) * s))).convert('RGB').save('fotos/%s-z.jpg' % k, quality=86)
    out[k] = {'x': x0, 'y': y0, 'w': w, 'h': h}
    print(k, 'zoom %.2fx' % (VW / w))
json.dump(out, open('zoom.json', 'w'), indent=1)
