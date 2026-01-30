// 图片预览器 - Background Service Worker
// 拦截图片下载，改为在预览页面中打开

// 只匹配明确的图片扩展名
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif)(\?.*)?$/i;

// 已处理的URL集合（防止重复处理）
const processedUrls = new Set();

// 判断是否为图片URL（只通过扩展名判断，更严格）
function isImageUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // 只检查路径部分，忽略查询参数
        return IMAGE_EXTENSIONS.test(pathname);
    } catch {
        return IMAGE_EXTENSIONS.test(url);
    }
}

// 判断是否为扩展内部页面
function isExtensionPage(url) {
    return url && url.startsWith(chrome.runtime.getURL(''));
}

console.log('🖼️ 图片预览器 Service Worker 已启动');

// 只使用 downloads API 拦截（更可靠）
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    const url = downloadItem.url;
    const mime = downloadItem.mime;

    console.log('📥 检测到下载:', {
        id: downloadItem.id,
        url: url,
        mime: mime
    });

    // 跳过扩展内部页面的请求
    if (isExtensionPage(url)) {
        console.log('⏭️ 扩展内部请求，跳过');
        return;
    }

    // 只通过 URL 扩展名检查是否为图片（更严格）
    if (!isImageUrl(url)) {
        console.log('⏭️ 非图片文件，跳过');
        return;
    }

    // 检查是否已处理过（防止循环）
    if (processedUrls.has(url)) {
        console.log('⏭️ URL已处理过，跳过');
        processedUrls.delete(url); // 清除，允许下次处理
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

    // 标记为已处理
    processedUrls.add(url);

    // 5秒后清除标记
    setTimeout(() => processedUrls.delete(url), 5000);

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
        processedUrls.delete(url);
    }
});

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
