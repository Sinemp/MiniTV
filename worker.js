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
    ffzy: {
        api: 'https://cj.ffzyapi.com',
        name: '非凡影视',
        detail: 'https://cj.ffzyapi.com',
    },
};

// 主事件處理邏輯
addEventListener('fetch', event => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  const request = event.request;
  const url = new URL(request.url);

  // API 請求路由
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/search') {
      return handleSearch(request);
    }
    if (url.pathname === '/api/detail') {
      return handleDetail(request);
    }
  }

  // 靜態資源處理
  try {
    return await getAssetFromKV(event);
  } catch (e) {
    try {
      // SPA 模式回退，找不到資源時嘗試回傳 index.html
      return await getAssetFromKV(event, { mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req) });
    } catch (err) {
      return new Response('Not Found', { status: 404 });
    }
  }
}

// API 處理函數 (修正版)
async function handleSearch(request) {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('wd');
    const source = url.searchParams.get('source') || 'dytt';
    const customApi = url.searchParams.get('customApi') || '';
    try {
        const apiUrl = customApi 
            ? `${customApi}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}` 
            : `${API_SITES[source].api}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}`;
            
        const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        
        const data = await response.text(); // 以文字形式接收，確保能處理不規範的 JSON
        return new Response(data, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } catch (error) {
        const errorResponse = JSON.stringify({ code: 400, msg: `搜索服务暂时不可用: ${error.message}`, list: [] });
        return new Response(errorResponse, { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
}

async function handleDetail(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const source = url.searchParams.get('source') || 'dytt';
    const customApi = url.searchParams.get('customApi') || '';
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

    try {
        const detailPageUrl = customApi 
            ? `${customApi}/index.php/vod/detail/id/${id}.html` 
            : `${API_SITES[source].detail}/index.php/vod/detail/id/${id}.html`;
            
        const fetchUrl = `https://r.jina.ai/${detailPageUrl}`;
        const response = await fetch(fetchUrl);
        const html = await response.text();

        let matches = [];
        // 使用更具彈性的正規表示式來捕獲 m3u8 連結
        const regex = /\$([^\$]+?\.m3u8)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push(match[1]);
        }
        
        const data = JSON.stringify({ episodes: matches, detailUrl: detailPageUrl });
        return new Response(data, { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: `Failed to fetch details: ${error.message}` }), { status: 500 });
    }
}
