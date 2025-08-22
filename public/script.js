let currentApiSource = localStorage.getItem('currentApiSource') || 'heimuer';
let customApiUrl = localStorage.getItem('customApiUrl') || '';

// 初始化时检查是否使用自定义接口
if (currentApiSource === 'custom') {
    document.getElementById('customApiInput').classList.remove('hidden');
    document.getElementById('customApiUrl').value = customApiUrl;
}

// 设置 select 的默认选中值
document.getElementById('apiSource').value = currentApiSource;

function toggleSettings(e) {
    // 阻止事件冒泡，防止触发document的点击事件
    e && e.stopPropagation();
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('show');
}

async function testSiteAvailability(source) {
    try {
        const apiParams = source === 'custom'
            ? '&customApi=' + encodeURIComponent(customApiUrl)
            : '&source=' + source;

        const response = await fetch('/api/search?wd=test' + apiParams);
        const data = await response.json();
        return data.code !== 400;
    } catch (error) {
        return false;
    }
}

function updateSiteStatus(isAvailable) {
    const statusEl = document.getElementById('siteStatus');
    if (isAvailable) {
        statusEl.innerHTML = '<span class="text-green-500">●</span> 可用';
    } else {
        statusEl.innerHTML = '<span class="text-red-500">●</span> 不可用';
    }
}

document.getElementById('apiSource').addEventListener('change', async function(e) {
    currentApiSource = e.target.value;
    const customApiInput = document.getElementById('customApiInput');

    if (currentApiSource === 'custom') {
        customApiInput.classList.remove('hidden');
        customApiUrl = document.getElementById('customApiUrl').value;
        localStorage.setItem('customApiUrl', customApiUrl);
        // 自定义接口不立即测试可用性
        document.getElementById('siteStatus').innerHTML = '<span class="text-gray-500">●</span> 待测试';
    } else {
        customApiInput.classList.add('hidden');
        // 非自定义接口立即测试可用性
        showToast('正在测试站点可用性...', 'info');
        const isAvailable = await testSiteAvailability(currentApiSource);
        updateSiteStatus(isAvailable);

        if (!isAvailable) {
            showToast('当前站点不可用，请尝试其他站点', 'error');
        } else {
            showToast('站点可用', 'success');
        }
    }

    localStorage.setItem('currentApiSource', currentApiSource);
    document.getElementById('currentCode').textContent = currentApiSource;

    // 清理搜索结果
    document.getElementById('results').innerHTML = '';
    document.getElementById('searchInput').value = '';
});

// 修改自定义接口输入框的事件监听
document.getElementById('customApiUrl').addEventListener('blur', async function(e) {
    customApiUrl = e.target.value;
    localStorage.setItem('customApiUrl', customApiUrl);

    if (currentApiSource === 'custom' && customApiUrl) {
        showToast('正在测试接口可用性...', 'info');
        const isAvailable = await testSiteAvailability('custom');
        updateSiteStatus(isAvailable);

        if (!isAvailable) {
            showToast('接口不可用，请检查地址是否正确', 'error');
        } else {
            showToast('接口可用', 'success');
        }
    }
});

// 初始化显示当前站点代码和状态
document.getElementById('currentCode').textContent = currentApiSource;
testSiteAvailability(currentApiSource).then(updateSiteStatus);

function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    const bgColors = {
        'error': 'bg-red-500',
        'success': 'bg-green-500',
        'info': 'bg-blue-500'
    };

    const bgColor = bgColors[type] || bgColors.error;
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${bgColor} text-white`;
    toastMessage.textContent = message;

    // 显示提示
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    // 3秒后自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-100%)';
    }, 3000);
}

// 添加显示/隐藏 loading 的函数
function showLoading() {
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    loading.style.display = 'none';
}

async function search() {
    showLoading();
    const query = document.getElementById('searchInput').value;
    const apiParams = currentApiSource === 'custom'
        ? '&customApi=' + encodeURIComponent(customApiUrl)
        : '&source=' + currentApiSource;

    try {
        const response = await fetch('/api/search?wd=' + encodeURIComponent(query) + apiParams);
        const data = await response.json();

        if (data.code === 400) {
            showToast(data.msg);
            return;
        }

        // 显示结果区域，调整搜索区域
        document.getElementById('searchArea').classList.remove('flex-1');
        document.getElementById('searchArea').classList.add('mb-8');
        document.getElementById('resultsArea').classList.remove('hidden');

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = data.list.map(item => `
            <div class="card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer p-6 h-fit" onclick="showDetails('${item.vod_id}','${item.vod_name}')">
                <h3 class="text-xl font-semibold mb-3">${item.vod_name}</h3>
                <p class="text-gray-400 text-sm mb-2">${item.type_name}</p>
                <p class="text-gray-400 text-sm">${item.vod_remarks}</p>
            </div>
        `).join('');
    } catch (error) {
        showToast('搜索请求失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

async function showDetails(id,vod_name) {
    showLoading();
    try {
        const apiParams = currentApiSource === 'custom'
            ? '&customApi=' + encodeURIComponent(customApiUrl)
            : '&source=' + currentApiSource;

        const response = await fetch('/api/detail?id=' + id + apiParams);
        const data = await response.json();

        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');

        modalTitle.textContent = vod_name;
        modalContent.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                ${data.episodes.map((episode, index) => `
                    <button onclick="playVideo('${episode}','${vod_name}')"
                            class="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-white rounded-lg transition-colors text-center">
                        第${index + 1}集
                    </button>
                `).join('')}
            </div>
        `;

        modal.classList.remove('hidden');
    } catch (error) {
        showToast('获取详情失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    // 清除 iframe 内容
    document.getElementById('modalContent').innerHTML = '';
}

function playVideo(url,vod_name) {
    showLoading();
    const modalContent = document.getElementById('modalContent');
    const currentTitle = modalTitle.textContent.split(' - ')[0];
    const currentHtml = modalContent.innerHTML;

    // 从当前点击的按钮获取集数
    const episodeNumber = event.target.textContent.replace(/[^0-9]/g, '');

    // 更新标题显示
    modalTitle.textContent = vod_name + " - 第" + episodeNumber + "集";

    // 先移除现有的视频播放器（如果存在）
    const existingPlayer = modalContent.querySelector('.video-player');
    if (existingPlayer) {
        existingPlayer.remove();
    }

    // 如果是第一次播放，保存集数列表
    if (!modalContent.querySelector('.episodes-list')) {
        modalContent.innerHTML = `
            <div class="space-y-6">
                <div class="video-player">
                    <iframe
                        src="https://hoplayer.com/index.html?url=${url}&autoplay=true"
                        width="100%"
                        height="600"
                        frameborder="0"
                        scrolling="no"
                        allowfullscreen="true"
                        onload="hideLoading()">
                    </iframe>
                </div>
                <div class="episodes-list mt-6">
                    ${currentHtml}
                </div>
            </div>
        `;
    } else {
        // 如果已经有集数列表，只更新视频播放器
        const episodesList = modalContent.querySelector('.episodes-list');
        modalContent.innerHTML = `
            <div class="space-y-6">
                <div class="video-player">
                    <iframe
                        src="https://hoplayer.com/index.html?url=${url}&autoplay=true"
                        width="100%"
                        height="600"
                        frameborder="0"
                        scrolling="no"
                        allowfullscreen="true"
                        onload="hideLoading()">
                    </iframe>
                </div>
                <div class="episodes-list mt-6">
                    ${episodesList.innerHTML}
                </div>
            </div>
        `;
    }
}

// 点击外部关闭设置面板
document.addEventListener('click', function(e) {
    const panel = document.getElementById('settingsPanel');
    const settingsButton = document.querySelector('button[onclick="toggleSettings()"]');

    if (!panel.contains(e.target) && !settingsButton.contains(e.target) && panel.classList.contains('show')) {
        panel.classList.remove('show');
    }
});

// 回车搜索
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        search();
    }
});
