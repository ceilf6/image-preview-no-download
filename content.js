// 图片预览器 - 内容脚本
let previewMode = false;
let originalClickHandlers = new Map();

// 初始化：从存储中读取设置
chrome.storage.sync.get(['previewEnabled'], function(result) {
    previewMode = result.previewEnabled || false;
    if (previewMode) {
        enablePreviewMode();
    }
});

// 启用预览模式
function enablePreviewMode() {
    console.log('图片预览模式已启用');

    // 为所有图片链接添加点击拦截
    const imageLinks = findImageLinks();
    imageLinks.forEach(link => {
        if (!originalClickHandlers.has(link)) {
            const originalHandler = link.onclick;
            originalClickHandlers.set(link, originalHandler);

            link.addEventListener('click', handleImageClick, true);
        }
    });

    // 监听新添加的链接（动态内容）
    observeNewLinks();
}

// 禁用预览模式
function disablePreviewMode() {
    console.log('图片预览模式已禁用');

    // 移除所有点击拦截
    const imageLinks = findImageLinks();
    imageLinks.forEach(link => {
        link.removeEventListener('click', handleImageClick, true);

        // 恢复原始点击处理器
        const originalHandler = originalClickHandlers.get(link);
        if (originalHandler) {
            link.onclick = originalHandler;
        }
    });

    originalClickHandlers.clear();

    // 停止监听新链接
    if (window.linkObserver) {
        window.linkObserver.disconnect();
    }
}

// 查找所有图片链接
function findImageLinks() {
    const selectors = [
        'a[href*=".jpg"]', 'a[href*=".jpeg"]', 'a[href*=".png"]',
        'a[href*=".gif"]', 'a[href*=".webp"]', 'a[href*=".svg"]',
        'a[href*="image"]', 'a[href*="img"]', 'a[href*="photo"]'
    ];

    const links = [];
    selectors.forEach(selector => {
        links.push(...document.querySelectorAll(selector));
    });

    // 额外检查：通过正则表达式匹配图片URL
    const allLinks = document.querySelectorAll('a[href]');
    allLinks.forEach(link => {
        if (isImageUrl(link.href) && !links.includes(link)) {
            links.push(link);
        }
    });

    return links;
}

// 判断是否为图片URL
function isImageUrl(url) {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
    const imageKeywords = /(image|img|photo|picture|pic)/i;

    return imageExtensions.test(url) || imageKeywords.test(url);
}

// 处理图片链接点击
function handleImageClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const link = event.currentTarget;
    const imageUrl = link.href;

    console.log('拦截图片链接:', imageUrl);

    // 显示加载提示
    showLoadingIndicator();

    // 尝试通过fetch加载图片
    loadAndDisplayImage(imageUrl)
        .catch(error => {
            console.error('Fetch失败，尝试直接打开:', error);
            // 如果fetch失败，回退到iframe方式
            displayImageViaIframe(imageUrl);
        })
        .finally(() => {
            hideLoadingIndicator();
        });
}

// 通过fetch加载并显示图片
async function loadAndDisplayImage(imageUrl) {
    try {
        const response = await fetch(imageUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        openImagePreviewWindow(blobUrl, imageUrl);

    } catch (error) {
        console.error('Fetch加载图片失败:', error);
        throw error;
    }
}

// 通过iframe方式显示图片（备用方案）
function displayImageViaIframe(imageUrl) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);

    iframe.onload = function() {
        try {
            // 尝试访问iframe内容
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const img = iframeDoc.querySelector('img');

            if (img && img.src) {
                openImagePreviewWindow(img.src, imageUrl);
            } else {
                // 如果iframe中没有找到图片，直接在新窗口打开原URL
                openImagePreviewWindow(imageUrl, imageUrl);
            }
        } catch (error) {
            // 跨域限制，直接打开原URL
            console.log('跨域限制，直接打开原URL');
            openImagePreviewWindow(imageUrl, imageUrl);
        }

        document.body.removeChild(iframe);
    };

    iframe.onerror = function() {
        console.error('iframe加载失败');
        openImagePreviewWindow(imageUrl, imageUrl);
        document.body.removeChild(iframe);
    };

    iframe.src = imageUrl;
}

// 打开图片预览窗口
function openImagePreviewWindow(imageSrc, originalUrl) {
    const newWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');

    if (!newWindow) {
        alert('弹窗被阻止，请允许弹窗后重试');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>图片预览 - ${originalUrl}</title>
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
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s;
                }

                .btn:hover {
                    background: #005a9e;
                }

                .btn.secondary {
                    background: #666;
                }

                .btn.secondary:hover {
                    background: #555;
                }

                .image-container {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    overflow: auto;
                }

                .image-wrapper {
                    max-width: 100%;
                    max-height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border-radius: 4px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }

                .loading {
                    color: #aaa;
                    font-size: 14px;
                }

                .error {
                    color: #ff6b6b;
                    text-align: center;
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <div class="url-info" title="${originalUrl}">${originalUrl}</div>
                <div class="actions">
                    <button class="btn" onclick="copyImage()">复制图片</button>
                    <button class="btn secondary" onclick="downloadImage()">下载图片</button>
                    <button class="btn secondary" onclick="openOriginal()">原始链接</button>
                </div>
            </div>

            <div class="image-container">
                <div class="image-wrapper">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <script>
                const imageSrc = '${imageSrc}';
                const originalUrl = '${originalUrl}';

                // 加载图片
                const img = new Image();
                img.onload = function() {
                    const container = document.querySelector('.image-wrapper');
                    container.innerHTML = '';
                    container.appendChild(img);
                };

                img.onerror = function() {
                    const container = document.querySelector('.image-wrapper');
                    container.innerHTML = '<div class="error">图片加载失败</div>';
                };

                img.src = imageSrc;

                // 复制图片到剪贴板
                async function copyImage() {
                    try {
                        const response = await fetch(imageSrc);
                        const blob = await response.blob();

                        await navigator.clipboard.write([
                            new ClipboardItem({
                                [blob.type]: blob
                            })
                        ]);

                        showMessage('图片已复制到剪贴板');
                    } catch (error) {
                        console.error('复制失败:', error);
                        showMessage('复制失败: ' + error.message, true);
                    }
                }

                // 下载图片
                function downloadImage() {
                    const a = document.createElement('a');
                    a.href = imageSrc;
                    a.download = getFilenameFromUrl(originalUrl) || 'image';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }

                // 打开原始链接
                function openOriginal() {
                    window.open(originalUrl, '_blank');
                }

                // 从URL提取文件名
                function getFilenameFromUrl(url) {
                    try {
                        const pathname = new URL(url).pathname;
                        return pathname.split('/').pop() || 'image';
                    } catch {
                        return 'image';
                    }
                }

                // 显示消息提示
                function showMessage(message, isError = false) {
                    const div = document.createElement('div');
                    div.style.cssText = \`
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: \${isError ? '#ff6b6b' : '#4caf50'};
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        z-index: 1000;
                        font-size: 14px;
                    \`;
                    div.textContent = message;
                    document.body.appendChild(div);

                    setTimeout(() => {
                        document.body.removeChild(div);
                    }, 3000);
                }

                // 键盘快捷键
                document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey || e.metaKey) {
                        switch(e.key) {
                            case 'c':
                                e.preventDefault();
                                copyImage();
                                break;
                            case 's':
                                e.preventDefault();
                                downloadImage();
                                break;
                        }
                    }

                    if (e.key === 'Escape') {
                        window.close();
                    }
                });
            </script>
        </body>
        </html>
    `;

    newWindow.document.write(html);
    newWindow.document.close();
}

// 监听新添加的链接
function observeNewLinks() {
    if (window.linkObserver) {
        window.linkObserver.disconnect();
    }

    window.linkObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 检查新添加的节点是否是图片链接
                    if (node.tagName === 'A' && isImageUrl(node.href)) {
                        if (!originalClickHandlers.has(node)) {
                            node.addEventListener('click', handleImageClick, true);
                        }
                    }

                    // 检查新添加节点的子元素
                    const newImageLinks = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
                    newImageLinks.forEach(link => {
                        if (isImageUrl(link.href) && !originalClickHandlers.has(link)) {
                            link.addEventListener('click', handleImageClick, true);
                        }
                    });
                }
            });
        });
    });

    window.linkObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// 显示加载指示器
function showLoadingIndicator() {
    if (document.getElementById('image-preview-loading')) return;

    const loading = document.createElement('div');
    loading.id = 'image-preview-loading';
    loading.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    loading.textContent = '正在加载图片...';
    document.body.appendChild(loading);
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const loading = document.getElementById('image-preview-loading');
    if (loading) {
        document.body.removeChild(loading);
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'togglePreview') {
        previewMode = !previewMode;

        // 保存设置
        chrome.storage.sync.set({previewEnabled: previewMode});

        if (previewMode) {
            enablePreviewMode();
        } else {
            disablePreviewMode();
        }

        sendResponse({
            status: previewMode ? 'enabled' : 'disabled',
            imageLinksFound: findImageLinks().length
        });
    } else if (request.action === 'getStatus') {
        sendResponse({
            status: previewMode ? 'enabled' : 'disabled',
            imageLinksFound: findImageLinks().length
        });
    }
});

// 页面加载完成后的初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (previewMode) {
            enablePreviewMode();
        }
    });
} else {
    if (previewMode) {
        enablePreviewMode();
    }
}