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

// 监听 fetch 事件
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

/**
 * 统一的请求处理器
 */
async function handleRequest(request) {
    const url = new URL(request.url);

    // 使用 if/else 进行路由判断
    if (url.pathname === '/api/search') {
        return handleSearch(request);
    }

    if (url.pathname === '/api/detail') {
        return handleDetail(request);
    }
    
    // 对于 API 路由之外的请求，Cloudflare Pages 会自动处理静态资源
    // 这里返回一个提示，表示 API 服务器正在运行
    return new Response('API server is running. Static content is handled by Pages.', { status: 200 });
}

/**
 * 处理 /api/search 的逻辑
 */
async function handleSearch(request) {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('wd');
    const source = url.searchParams.get('source') || 'heimuer';
    const customApi = url.searchParams.get('customApi') || '';

    try {
        const apiUrl = customApi
            ? `${customApi}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}`
            : `${API_SITES[source].api}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: 'application/json',
            },
        });
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.text();
        return new Response(data, {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (error) {
        const errorResponse = JSON.stringify({ code: 400, msg: '搜索服务暂时不可用', list: [] });
        return new Response(errorResponse, {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}

/**
 * 处理 /api/detail 的逻辑
 */
async function handleDetail(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const source = url.searchParams.get('source') || 'heimuer';
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
