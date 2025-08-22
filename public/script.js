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
    // 使用 textContent 避免 XSS
    statusEl.textContent = isAvailable ? ' ● 可用' : ' ● 不可用';
    statusEl.classList.toggle('text-green-500', isAvailable);
    statusEl.classList.toggle('text-red-500', !isAvailable);
}

document.getElementById('apiSource').addEventListener('change', async function(e) {
    currentApiSource = e.target.value;
    const customApiInput = document.getElementById('customApiInput');

    if (currentApiSource === 'custom') {
        customApiInput.classList.remove('hidden');
        customApiUrl = document.getElementById('customApiUrl').value;
        localStorage.setItem('customApiUrl', customApiUrl);
        document.getElementById('siteStatus').textContent = ' ● 待测试';
        document.getElementById('siteStatus').className = 'ml-2 text-gray-500';
    } else {
        customApiInput.classList.add('hidden');
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

    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-100%)';
    }, 3000);
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

async function search() {
    showLoading();
    const query = document.getElementById('searchInput').value;
    if (!query) {
        showToast('请输入搜索内容', 'info');
        hideLoading();
        return;
    }
    const apiParams = currentApiSource === 'custom'
        ? '&customApi=' + encodeURIComponent(customApiUrl)
        : '&source=' + currentApiSource;

    try {
        const response = await fetch('/api/search?wd=' + encodeURIComponent(query) + apiParams);
        const data = await response.json();

        if (data.code === 400) {
            showToast(data.msg || '搜索失败');
            return;
        }

        document.getElementById('searchArea').classList.remove('flex-1');
        document.getElementById('searchArea').classList.add('mb-8');
        document.getElementById('resultsArea').classList.remove('hidden');

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = ''; // Clear previous results

        if (!data.list || data.list.length === 0) {
            resultsDiv.textContent = '未找到相关结果。';
            return;
        }
        
        data.list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card-hover bg-[#111] rounded-lg overflow-hidden cursor-pointer p-6 h-fit';
            card.onclick = () => showDetails(item.vod_id, item.vod_name);

            const title = document.createElement('h3');
            title.className = 'text-xl font-semibold mb-3';
            title.textContent = item.vod_name;

            const type = document.createElement('p');
            type.className = 'text-gray-400 text-sm mb-2';
            type.textContent = item.type_name;

            const remarks = document.createElement('p');
            remarks.className = 'text-gray-400 text-sm';
            remarks.textContent = item.vod_remarks;

            card.appendChild(title);
            card.appendChild(type);
            card.appendChild(remarks);

            resultsDiv.appendChild(card);
        });
    } catch (error) {
        showToast('搜索请求失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

async function showDetails(id, vod_name) {
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
        modalContent.innerHTML = '';

        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2';

        if (!data.episodes || data.episodes.length === 0) {
            gridContainer.textContent = '未找到可播放的剧集。';
        } else {
            data.episodes.forEach((episode, index) => {
                const button = document.createElement('button');
                button.className = 'px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-white rounded-lg transition-colors text-center';
                button.textContent = `第${index + 1}集`;
                button.onclick = (event) => playVideo(event, episode, vod_name, data.episodes);
                gridContainer.appendChild(button);
            });
        }

        modalContent.appendChild(gridContainer);
        modal.classList.remove('hidden');
    } catch (error) {
        showToast('获取详情失败，请稍后重试');
    } finally {
        hideLoading();
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modalContent').innerHTML = '';
}

function playVideo(event, url, vod_name) {
    showLoading();
    const modalContent = document.getElementById('modalContent');
    const modalTitle = document.getElementById('modalTitle');
    const episodeNumber = event.target.textContent.replace(/[^0-9]/g, '');

    modalTitle.textContent = `${vod_name} - 第${episodeNumber}集`;

    let playerContainer = modalContent.querySelector('.video-player-container');
    
    // 如果還沒有播放器結構，就建立它
    if (!playerContainer) {
        const episodesContainer = modalContent.querySelector('.grid');
        
        playerContainer = document.createElement('div');
        playerContainer.className = 'video-player-container space-y-6';

        const playerDiv = document.createElement('div');
        playerDiv.className = 'video-player';
        const iframe = document.createElement('iframe');
        iframe.width = "100%";
        iframe.height = "600";
        iframe.frameBorder = "0";
        iframe.scrolling = "no";
        iframe.allowFullscreen = true;
        iframe.onload = () => hideLoading();
        playerDiv.appendChild(iframe);

        const episodesListDiv = document.createElement('div');
        episodesListDiv.className = 'episodes-list mt-6';
        episodesListDiv.appendChild(episodesContainer); 

        playerContainer.appendChild(playerDiv);
        playerContainer.appendChild(episodesListDiv);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(playerContainer);
    }
    
    // 更新或設定 iframe 的 src
    const iframe = modalContent.querySelector('iframe');
    if (iframe && iframe.src.includes(encodeURIComponent(url))) {
        hideLoading();
        return;
    }
    iframe.src = `https://hoplayer.com/index.html?url=${encodeURIComponent(url)}&autoplay=true`;
}


document.addEventListener('click', function(e) {
    const panel = document.getElementById('settingsPanel');
    const settingsButton = document.querySelector('button[onclick^="toggleSettings"]');

    if (panel && settingsButton && !panel.contains(e.target) && !settingsButton.contains(e.target) && panel.classList.contains('show')) {
        panel.classList.remove('show');
    }
});

document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        search();
    }
});
