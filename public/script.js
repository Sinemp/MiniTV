let currentApiSource = localStorage.getItem('currentApiSource') || 'heimuer';
let customApiUrl = localStorage.getItem('customApiUrl') || '';

// 初始化时检查是否使用自定义接口
if (currentApiSource === 'custom') {
    document.getElementById('customApiInput').classList.remove('hidden');
    document.getElementById('customApiUrl').value = customApiUrl;
}

// ...後面所有的 JavaScript 程式碼
