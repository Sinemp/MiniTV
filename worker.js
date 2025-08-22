// 從 CDN 匯入 itty-router
import { Router } from 'itty-router';

// API 站點設定保持不變
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

// 初始化路由器
const router = Router();

/**
 * 處理搜尋請求的函數
 * GET /api/search?wd=...&source=...
 */
router.get('/api/search', async (request) => {
    const { query } = request; // itty-router 會自動解析查詢參數
    const searchQuery = query.wd;
    const source = query.source || 'heimuer';
    const customApi = query.customApi || '';

    try {
        const apiUrl = customApi
            ? `${customApi}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}`
            // 修正：確保自訂 API 也有搜尋參數
            : `${API_SITES[source].api}/api.php/provide/vod/?ac=list&wd=${encodeURIComponent(searchQuery)}`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error('API request failed with status: ' + response.status);
        }
        
        const data = await response.json(); // 直接解析為 JSON

        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error("Search API Error:", error);
        const errorResponse = {
            code: 400,
            msg: '搜索服务暂时不可用，请稍后再试',
            list: [],
        };
        return new Response(JSON.stringify(errorResponse), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
});

/**
 * 處理影片詳情請求的函數
 * GET /api/detail?id=...&source=...
 */
router.get('/api/detail', async (request) => {
    const { query } = request;
    const id = query.id;
    const source = query.source || 'heimuer';
    const customApi = query.customApi || '';

    // 如果沒有 ID，返回錯誤
    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400 });
    }

    try {
        const detailPageUrl = customApi 
            ? `${customApi}/index.php/vod/detail/id/${id}.html` 
            : `${API_SITES[source].detail}/index.php/vod/detail/id/${id}.html`;
            
        // 使用代理來抓取，避免 CORS 問題
        const fetchUrl = `https://r.jina.ai/${detailPageUrl}`;
        const response = await fetch(fetchUrl);
        const html = await response.text();

        let matches = [];
        if (source === 'ffzy') {
            matches = html.match(/(?<=\$)(https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8)/g) || [];
            matches = matches.map(link => link.split('(')[1]);
        } else {
            matches = html.match(/\$https?:\/\/[^"'\s]+?\.m3u8/g) || [];
            matches = matches.map(link => link.substring(1)); // 移除开头的 $
        }
        
        const data = {
            episodes: matches,
            detailUrl: detailPageUrl,
        };

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Detail API Error:", error);
        return new Response(JSON.stringify({ error: 'Failed to fetch details.' }), { status: 500 });
    }
});


// 處理所有其他未匹配的路由 (404 Not Found)
router.all('*', () => new Response('404, not found!', { status: 404 }));

// 將 fetch 事件監聽器指向路由器的 handle 方法
addEventListener('fetch', (event) => {
    event.respondWith(router.handle(event.request));
});
