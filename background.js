// 图片预览器 - Background Service Worker
// 拦截图片下载，改为在预览页面中打开

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;

// 判断是否为图片URL
function isImageUrl(url) {
    return IMAGE_EXTENSIONS.test(url);
}

// 监听下载事件，拦截图片下载
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    const url = downloadItem.url;

    // 检查是否为图片URL
    if (!isImageUrl(url)) return;

    // 检查预览模式是否启用
    const result = await chrome.storage.sync.get(['previewEnabled']);
    if (!result.previewEnabled) return;

    console.log('拦截图片下载:', url);

    // 取消下载
    chrome.downloads.cancel(downloadItem.id);

    // 删除下载记录
    chrome.downloads.erase({ id: downloadItem.id });

    // 打开预览页面
    const previewUrl = chrome.runtime.getURL('preview.html') + '?url=' + encodeURIComponent(url);
    chrome.tabs.create({ url: previewUrl });
});

// 同时监听导航事件（用于直接在地址栏输入图片URL的情况）
chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
        // 只处理主框架的导航
        if (details.frameId !== 0) return;

        const url = details.url;

        // 检查是否为图片URL
        if (!isImageUrl(url)) return;

        // 检查预览模式是否启用
        const result = await chrome.storage.sync.get(['previewEnabled']);
        if (!result.previewEnabled) return;

        console.log('拦截图片导航:', url);

        // 重定向到预览页面
        const previewUrl = chrome.runtime.getURL('preview.html') + '?url=' + encodeURIComponent(url);
        chrome.tabs.update(details.tabId, { url: previewUrl });
    },
    { url: [{ urlMatches: '.*\\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\\?.*)?$' }] }
);

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(() => {
    console.log('图片预览器已安装/更新');
});
