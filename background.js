// 图片预览器 - Background Service Worker
// 拦截直接导航到图片URL的请求，改为在预览页面中打开

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;

// 判断是否为图片URL
function isImageUrl(url) {
    return IMAGE_EXTENSIONS.test(url);
}

// 监听导航事件，在页面加载前拦截
chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
        // 只处理主框架的导航（不处理iframe）
        if (details.frameId !== 0) return;

        const url = details.url;

        // 检查是否为图片URL
        if (!isImageUrl(url)) return;

        // 检查预览模式是否启用
        const result = await chrome.storage.sync.get(['previewEnabled']);
        if (!result.previewEnabled) return;

        console.log('拦截图片导航:', url);

        // 创建预览页面的HTML
        const previewHtml = createPreviewHtml(url);
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(previewHtml);

        // 重定向到预览页面
        chrome.tabs.update(details.tabId, { url: dataUrl });
    },
    { url: [{ urlMatches: '.*\\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\\?.*)?$' }] }
);

// 创建预览页面HTML
function createPreviewHtml(imageUrl) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>图片预览 - ${imageUrl}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #1a1a1a;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        .toolbar {
            background: #2d2d2d;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #444;
            flex-shrink: 0;
        }

        .url-info {
            font-size: 12px;
            color: #aaa;
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            background: #007acc;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }

        .btn:hover {
            background: #005a9e;
        }

        .btn.secondary {
            background: #555;
        }

        .btn.secondary:hover {
            background: #666;
        }

        .image-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            overflow: auto;
        }

        img {
            max-width: 100%;
            max-height: calc(100vh - 80px);
            object-fit: contain;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .loading {
            color: #aaa;
            font-size: 16px;
        }

        .error {
            color: #ff6b6b;
            text-align: center;
            padding: 20px;
        }

        .toast {
            position: fixed;
            top: 70px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 1000;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .toast.show {
            opacity: 1;
        }

        .toast.error {
            background: #ff6b6b;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="url-info" title="${imageUrl}">${imageUrl}</div>
        <div class="actions">
            <button class="btn" onclick="copyImage()">📋 复制图片</button>
            <button class="btn secondary" onclick="downloadImage()">💾 下载</button>
            <button class="btn secondary" onclick="openOriginal()">🔗 原始链接</button>
        </div>
    </div>

    <div class="image-container">
        <div class="loading">加载中...</div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const imageUrl = '${imageUrl}';
        const container = document.querySelector('.image-container');

        // 加载图片
        const img = new Image();
        img.onload = function() {
            container.innerHTML = '';
            container.appendChild(img);
        };

        img.onerror = function() {
            container.innerHTML = '<div class="error">❌ 图片加载失败<br><br><a href="' + imageUrl + '" style="color: #007acc;">点击尝试直接打开</a></div>';
        };

        img.src = imageUrl;

        // 显示提示
        function showToast(message, isError = false) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast show' + (isError ? ' error' : '');
            setTimeout(() => { toast.className = 'toast'; }, 3000);
        }

        // 复制图片
        async function copyImage() {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
                showToast('✅ 图片已复制到剪贴板');
            } catch (error) {
                showToast('复制失败: ' + error.message, true);
            }
        }

        // 下载图片
        function downloadImage() {
            const a = document.createElement('a');
            a.href = imageUrl;
            a.download = imageUrl.split('/').pop().split('?')[0] || 'image';
            a.click();
        }

        // 打开原始链接
        function openOriginal() {
            window.location.href = imageUrl;
        }

        // 快捷键
        document.addEventListener('keydown', function(e) {
            if (e.metaKey || e.ctrlKey) {
                if (e.key === 'c') { e.preventDefault(); copyImage(); }
                if (e.key === 's') { e.preventDefault(); downloadImage(); }
            }
            if (e.key === 'Escape') window.close();
        });
    </script>
</body>
</html>`;
}

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(() => {
    console.log('图片预览器已安装/更新');
});
