import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
// API 站點設定
const API_SITES = {
    dytt: {
        api: 'http://caiji.dyttzyapi.com',
        name: '电影天堂',
        detail: 'http://caiji.dyttzyapi.com',
    },
    ruyi: {
        api: 'http://cj.rycjapi.com',
        name: '如意资源',
        detail: 'http://cj.rycjapi.com',
    },
};

// 主事件處理邏輯
addEventListener('fetch', event => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  const request = event.request;
  const url = new URL(request.url);

  // 如果是 API 請求，直接交給 API 處理器
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/search') {
      return handleSearch(request);
    }
    if (url.pathname === '/api/detail') {
      return handleDetail(request);
    }
  }

  // 對於所有其他請求，嘗試作為靜態網站資源來提供
  try {
    return await getAssetFromKV(event);
  } catch (e) {
    // 如果找不到資源，返回 404
    // 為了讓單頁應用程式 (SPA) 的路由正常運作，我們可以嘗試回傳 index.html
    try {
      return await getAssetFromKV(event, { mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req) });
    } catch (err) {
      return new Response('Not Found', { status: 404 });
    }
  }
}

// API 處理函數 (無重複)
async function handleSearch(request) {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('wd');
    const source = url.searchParams.get('source') || 'heimuer';
    const customApi = url.searchParams.get('customApi') || '';
    try {
        const apiUrl = customApi ? `${customApi}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}` : `${API_SITES[source].api}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Accept': 'application/json' } });
        if (!response.ok) throw new Error('API request failed');
        const data = await response.text();
        return new Response(data, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } catch (error) {
        const errorResponse = JSON.stringify({ code: 400, msg: '搜索服务暂时不可用', list: [] });
        return new Response(errorResponse, { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
}

async function handleDetail(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const source = url.searchParams.get('source') || 'heimuer';
    const customApi = url.searchParams.get('customApi') || '';
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
    try {
        const detailPageUrl = customApi ? `${customApi}/index.php/vod/detail/id/${id}.html` : `${API_SITES[source].detail}/index.php/vod/detail/id/${id}.html`;
        const fetchUrl = `https://r.jina.ai/${detailPageUrl}`;
        const response = await fetch(fetchUrl);
        const html = await response.text();
        let matches = [];
        if (source === 'ffzy') {
            matches = html.match(/(?<=\$)(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g) || [];
            matches = matches.map(link => link.split('(')[1]);
        } else {
            matches = html.match(/\$https?:\/\/[^"'\s]+?\.m3u8/g) || [];
            matches = matches.map(link => link.substring(1));
        }
        const data = JSON.stringify({ episodes: matches, detailUrl: detailPageUrl });
        return new Response(data, { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch details' }), { status: 500 });
    }
}
