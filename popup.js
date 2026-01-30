// 图片预览器 - 弹出窗口脚本
document.addEventListener('DOMContentLoaded', function() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const mainContent = document.getElementById('main-content');
    const toggleButton = document.getElementById('toggle-button');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const linksCount = document.getElementById('links-count');
    const helpLink = document.getElementById('help-link');

    // 初始化
    init();

    async function init() {
        try {
            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

            if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                showError('此页面不支持图片预览功能');
                return;
            }

            // 向内容脚本发送消息获取状态
            const response = await sendMessageToTab(tab.id, {action: 'getStatus'});

            if (response) {
                updateUI(response);
                showMainContent();
            } else {
                showError('无法连接到页面，请刷新页面后重试');
            }

        } catch (error) {
            console.error('初始化失败:', error);
            showError('初始化失败: ' + error.message);
        }
    }

    // 发送消息到内容脚本
    function sendMessageToTab(tabId, message) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('发送消息失败:', chrome.runtime.lastError);
                    resolve(null);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // 更新UI状态
    function updateUI(status) {
        const isEnabled = status.status === 'enabled';
        const imageLinksFound = status.imageLinksFound || 0;

        // 更新状态指示器
        statusIndicator.className = `status-indicator ${isEnabled ? 'enabled' : 'disabled'}`;
        statusText.textContent = isEnabled ? '已启用' : '已禁用';

        // 更新链接计数
        linksCount.textContent = `${imageLinksFound} 个`;

        // 更新按钮
        toggleButton.className = `toggle-button ${isEnabled ? 'enabled' : 'disabled'}`;
        toggleButton.textContent = isEnabled ? '禁用预览模式' : '启用预览模式';
        toggleButton.disabled = false;

        // 如果没有找到图片链接，显示提示
        if (imageLinksFound === 0) {
            linksCount.innerHTML = `0 个 <span style="color: #ea4335;">（未找到图片链接）</span>`;
        }
    }

    // 显示主要内容
    function showMainContent() {
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        mainContent.style.display = 'block';
    }

    // 显示错误信息
    function showError(message) {
        loadingDiv.style.display = 'none';
        mainContent.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = message;
    }

    // 切换预览模式
    toggleButton.addEventListener('click', async function() {
        try {
            toggleButton.disabled = true;
            toggleButton.textContent = '处理中...';

            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

            if (!tab) {
                throw new Error('无法获取当前标签页');
            }

            // 发送切换消息
            const response = await sendMessageToTab(tab.id, {action: 'togglePreview'});

            if (response) {
                updateUI(response);

                // 显示操作结果提示
                const isEnabled = response.status === 'enabled';
                showNotification(
                    isEnabled ? '预览模式已启用' : '预览模式已禁用',
                    isEnabled ? 'success' : 'info'
                );

                // 如果启用了预览模式且找到了图片链接，显示额外提示
                if (isEnabled && response.imageLinksFound > 0) {
                    setTimeout(() => {
                        showNotification(`已找到 ${response.imageLinksFound} 个图片链接`, 'info');
                    }, 1500);
                }
            } else {
                throw new Error('无法与页面通信');
            }

        } catch (error) {
            console.error('切换失败:', error);
            showNotification('操作失败: ' + error.message, 'error');

            // 重新获取状态以恢复UI
            setTimeout(init, 1000);
        }
    });

    // 显示通知
    function showNotification(message, type = 'info') {
        // 移除现有通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';

        const colors = {
            success: '#34a853',
            error: '#ea4335',
            info: '#1a73e8'
        };

        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 10px 12px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
            z-index: 1000;
            animation: slideDown 0.3s ease;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        // 添加动画样式
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideDown 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    // 帮助链接点击事件
    helpLink.addEventListener('click', function(e) {
        e.preventDefault();

        const helpContent = `
图片预览器使用说明：

🔧 功能说明：
• 自动检测页面中的图片链接
• 阻止图片链接的自动下载行为
• 在新窗口中预览图片
• 支持复制图片到剪贴板
• 支持下载图片到本地

📋 支持的图片格式：
• JPG, JPEG, PNG, GIF, WebP, SVG
• 包含 "image", "img", "photo" 关键词的链接

⌨️ 快捷键（在预览窗口中）：
• Ctrl+C (Cmd+C): 复制图片
• Ctrl+S (Cmd+S): 下载图片
• Esc: 关闭预览窗口

🛠️ 使用步骤：
1. 点击"启用预览模式"按钮
2. 在页面中点击图片链接
3. 图片将在新窗口中打开预览
4. 可以复制或下载图片

⚠️ 注意事项：
• 需要允许弹窗才能正常预览
• 某些网站可能有跨域限制
• 扩展仅在普通网页中工作，不支持Chrome内部页面

如有问题，请检查浏览器的弹窗设置。
        `;

        alert(helpContent);
    });

    // 监听存储变化，同步UI状态
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'sync' && changes.previewEnabled) {
            const isEnabled = changes.previewEnabled.newValue;
            updateUI({
                status: isEnabled ? 'enabled' : 'disabled',
                imageLinksFound: parseInt(linksCount.textContent) || 0
            });
        }
    });

    // 定期刷新链接计数（用于动态内容）
    setInterval(async function() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && !tab.url.startsWith('chrome://')) {
                const response = await sendMessageToTab(tab.id, {action: 'getStatus'});
                if (response) {
                    // 只更新链接计数，不改变启用状态
                    const currentCount = parseInt(linksCount.textContent) || 0;
                    if (response.imageLinksFound !== currentCount) {
                        linksCount.textContent = `${response.imageLinksFound} 个`;

                        if (response.imageLinksFound === 0) {
                            linksCount.innerHTML = `0 个 <span style="color: #ea4335;">（未找到图片链接）</span>`;
                        }
                    }
                }
            }
        } catch (error) {
            // 静默处理错误，避免干扰用户
            console.log('刷新链接计数失败:', error);
        }
    }, 5000); // 每5秒检查一次
});