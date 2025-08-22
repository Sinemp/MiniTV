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

// 監聽 fetch 事件
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);

    // API 路由處理
    if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request);
    }

    // 對於非 API 請求，在 Cloudflare Pages 這類平台上，
    // 系統會自動為您提供 public 資料夾中的靜態檔案。
    // 如果您是手動部署到 Workers，則需要額外程式碼來提供靜態資源，
    // 但 Pages 部署更為簡單，建議採用。

    // 預設回傳一個提示，說明 API 正在運作
    return new Response('API server is running.', { status: 200 });
}

async function handleApiRequest(request) {
    const url = new URL(request.url);

    if (url.pathname === '/api/search') {
        const searchQuery = url.searchParams.get('wd');
        const source = url.searchParams.get('source') || 'heimuer';
        const customApi = url.searchParams.get('customApi') || '';

        try {
            const apiUrl = customApi
                ? customApi
                : API_SITES[source].api + '/api.php/provide/vod/?ac=list&wd=' + encodeURIComponent(searchQuery);

            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error('API 请求失败');
            }
            const data = await response.text();
            return new Response(data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } catch (error) {
            return new Response(
                JSON.stringify({
                    code: 400,
                    msg: '搜索服务暂时不可用，请稍后再试',
                    list: [],
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    status: 400
                },
            );
        }
    }

    if (url.pathname === '/api/detail') {
        const id = url.searchParams.get('id');
        const source = url.searchParams.get('source') || 'heimuer';
        const customApi = url.searchParams.get('customApi') || '';
        const detailUrl = `https://r.jina.ai/${
            customApi ? customApi : API_SITES[source].detail
        }/index.php/vod/detail/id/${id}.html`;
        const response = await fetch(detailUrl);
        const html = await response.text();

        let matches = [];
        if (source === 'ffzy') {
            matches = html.match(/(?<=\$)(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g) || [];
            matches = matches.map(link => link.split('(')[1]);
        } else {
            matches = html.match(/\$https?:\/\/[^"'\s]+?\.m3u8/g) || [];
            matches = matches.map(link => link.substring(1)); // 移除开头的 $
        }

        return new Response(
            JSON.stringify({
                episodes: matches,
                detailUrl: detailUrl,
            }),
            {
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }

    return new Response('API route not found', { status: 404 });
}
