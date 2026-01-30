// 图片预览页面脚本
console.log('🖼️ 预览页面已加载');

// 从URL参数获取图片地址
const params = new URLSearchParams(window.location.search);
const imageUrl = params.get('url');

console.log('📷 图片URL:', imageUrl);

const container = document.getElementById('container');
const urlInfo = document.getElementById('urlInfo');

if (!imageUrl) {
    container.innerHTML = '<div class="error">❌ 未提供图片URL</div>';
} else {
    // 更新标题和URL显示
    document.title = '图片预览';
    urlInfo.textContent = imageUrl;
    urlInfo.title = imageUrl;

    // 创建图片元素
    const img = document.createElement('img');
    img.id = 'preview-image';

    // 设置超时
    const timeout = setTimeout(() => {
        console.log('⏰ 图片加载超时');
        container.innerHTML =
            '<div class="error">' +
            '⏰ 图片加载超时<br><br>' +
            '<a href="' + imageUrl + '" target="_blank">点击直接打开图片</a>' +
            '</div>';
    }, 15000);

    img.onload = function() {
        console.log('✅ 图片加载成功');
        clearTimeout(timeout);
        container.innerHTML = '';
        container.appendChild(img);
    };

    img.onerror = function(e) {
        console.log('❌ 图片加载失败:', e);
        clearTimeout(timeout);
        container.innerHTML =
            '<div class="error">' +
            '❌ 图片加载失败<br><br>' +
            '<a href="' + imageUrl + '" target="_blank">点击直接打开图片</a>' +
            '</div>';
    };

    console.log('🔄 开始加载图片...');
    img.src = imageUrl;
}

// 显示提示
function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(function() { toast.className = 'toast'; }, 3000);
}

// 复制图片
document.getElementById('copyBtn').addEventListener('click', async function() {
    if (!imageUrl) return;
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        showToast('✅ 图片已复制到剪贴板', false);
    } catch (error) {
        console.error('复制失败:', error);
        showToast('复制失败: ' + error.message, true);
    }
});

// 下载图片 - 临时禁用预览模式
document.getElementById('downloadBtn').addEventListener('click', async function() {
    if (!imageUrl) return;
    try {
        // 临时禁用预览模式
        await chrome.storage.sync.set({ previewEnabled: false });

        // 触发下载
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = imageUrl.split('/').pop().split('?')[0] || 'image';
        a.click();

        // 1秒后重新启用
        setTimeout(async function() {
            await chrome.storage.sync.set({ previewEnabled: true });
        }, 1000);
    } catch (error) {
        console.error('下载失败:', error);
        showToast('下载失败: ' + error.message, true);
    }
});

// 打开原始链接
document.getElementById('openBtn').addEventListener('click', async function() {
    if (!imageUrl) return;
    // 临时禁用预览模式后打开
    await chrome.storage.sync.set({ previewEnabled: false });
    window.open(imageUrl, '_blank');
    // 1秒后重新启用
    setTimeout(async function() {
        await chrome.storage.sync.set({ previewEnabled: true });
    }, 1000);
});

// 快捷键
document.addEventListener('keydown', function(e) {
    if (e.metaKey || e.ctrlKey) {
        if (e.key === 'c') {
            e.preventDefault();
            document.getElementById('copyBtn').click();
        }
        if (e.key === 's') {
            e.preventDefault();
            document.getElementById('downloadBtn').click();
        }
    }
    if (e.key === 'Escape') window.close();
});
