// 图片预览器 - 弹出窗口脚本
// 直接操作 storage，不依赖当前页面

document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.getElementById('toggle-button');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    // 初始化
    init();

    async function init() {
        // 直接从 storage 读取状态
        const result = await chrome.storage.sync.get(['previewEnabled']);
        const isEnabled = result.previewEnabled || false;
        updateUI(isEnabled);
    }

    // 更新UI状态
    function updateUI(isEnabled) {
        statusIndicator.className = `status-indicator ${isEnabled ? 'enabled' : 'disabled'}`;
        statusText.textContent = isEnabled ? '已启用' : '已禁用';
        toggleButton.className = `toggle-button ${isEnabled ? 'enabled' : 'disabled'}`;
        toggleButton.textContent = isEnabled ? '禁用预览模式' : '启用预览模式';
        toggleButton.disabled = false;
    }

    // 切换预览模式
    toggleButton.addEventListener('click', async function () {
        toggleButton.disabled = true;
        toggleButton.textContent = '处理中...';

        // 直接从 storage 读取并切换状态
        const result = await chrome.storage.sync.get(['previewEnabled']);
        const newState = !result.previewEnabled;

        // 保存新状态
        await chrome.storage.sync.set({ previewEnabled: newState });

        updateUI(newState);
        showNotification(newState ? '预览模式已启用' : '预览模式已禁用', newState ? 'success' : 'info');
    });

    // 显示通知
    function showNotification(message, type = 'info') {
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
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 2000);
    }

    // 监听存储变化
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (namespace === 'sync' && changes.previewEnabled) {
            updateUI(changes.previewEnabled.newValue);
        }
    });
});
