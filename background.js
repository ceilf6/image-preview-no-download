// 图片预览器 - Background Service Worker
// 拦截图片下载，改为在预览页面中打开

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif)(\?.*)?$/i;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/x-icon', 'image/tiff', 'image/avif'];

// 判断是否为图片URL（通过扩展名）
function isImageUrl(url) {
    return IMAGE_EXTENSIONS.test(url);
}

// 判断是否为图片（通过MIME类型）
function isImageMime(mime) {
    return mime && IMAGE_MIME_TYPES.some(type => mime.startsWith(type));
}

console.log('🖼️ 图片预览器 Service Worker 已启动');

// 监听所有下载事件
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    console.log('📥 检测到下载:', {
        id: downloadItem.id,
        url: downloadItem.url,
        filename: downloadItem.filename,
        mime: downloadItem.mime,
        state: downloadItem.state
    });

    const url = downloadItem.url;
    const mime = downloadItem.mime;

    // 检查是否为图片（通过URL扩展名或MIME类型）
    const isImage = isImageUrl(url) || isImageMime(mime);

    if (!isImage) {
        console.log('⏭️ 非图片文件，跳过');
        return;
    }

    // 检查预览模式是否启用
    const result = await chrome.storage.sync.get(['previewEnabled']);
    console.log('🔧 预览模式状态:', result.previewEnabled);

    if (!result.previewEnabled) {
        console.log('⏭️ 预览模式未启用，跳过');
        return;
    }

    console.log('🚫 拦截图片下载:', url);

    try {
        // 取消下载
        await chrome.downloads.cancel(downloadItem.id);
        console.log('✅ 下载已取消');

        // 删除下载记录
        await chrome.downloads.erase({ id: downloadItem.id });
        console.log('✅ 下载记录已删除');

        // 打开预览页面
        const previewUrl = chrome.runtime.getURL('preview.html') + '?url=' + encodeURIComponent(url);
        await chrome.tabs.create({ url: previewUrl });
        console.log('✅ 预览页面已打开');
    } catch (error) {
        console.error('❌ 拦截失败:', error);
    }
});

// 监听导航事件（用于直接访问图片URL的情况）
chrome.webNavigation.onBeforeNavigate.addListener(
    async (details) => {
        if (details.frameId !== 0) return;

        const url = details.url;
        console.log('🔗 检测到导航:', url);

        if (!isImageUrl(url)) {
            console.log('⏭️ 非图片URL，跳过');
            return;
        }

        const result = await chrome.storage.sync.get(['previewEnabled']);
        if (!result.previewEnabled) {
            console.log('⏭️ 预览模式未启用，跳过');
            return;
        }

        console.log('🚫 拦截图片导航:', url);

        const previewUrl = chrome.runtime.getURL('preview.html') + '?url=' + encodeURIComponent(url);
        chrome.tabs.update(details.tabId, { url: previewUrl });
    },
    { url: [{ urlMatches: '.*\\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif)(\\?.*)?$' }] }
);

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(() => {
    console.log('🖼️ 图片预览器已安装/更新');
    // 默认启用预览模式
    chrome.storage.sync.get(['previewEnabled'], (result) => {
        if (result.previewEnabled === undefined) {
            chrome.storage.sync.set({ previewEnabled: true });
            console.log('✅ 默认启用预览模式');
        }
    });
});
