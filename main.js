// Header-main.js
// 依赖 jQuery

// 打开移动端抽屉菜单
function openMenu() {
    $("body").css("overflow", "hidden");
    $(".drawer-menu-plane").addClass("drawer-menu-plane-show");
    // 将PC端的菜单和用户区移动到抽屉菜单中
    $(".menu-plane").appendTo($(".drawer-menu-list"));
    $(".user-menu-plane").appendTo($(".drawer-menu-list"));
    // 为有子菜单的项添加下拉箭头
    $(".user-menu-main").not(".user-menu-main-notlogin").append('<div class="m-dropdown" onclick="mobile_menuclick(event,this)"><i class="fal fa-angle-down"></i></div>');
    $(".phone-tabs").css("display", "none");
}

// 关闭移动端抽屉菜单
function closeMenu() {
    $("body").css("overflow", "auto");
    $(".drawer-menu-plane").removeClass("drawer-menu-plane-show");
    // 将菜单和用户区移回PC端位置
    $(".user-menu-plane").prependTo($(".header-menu"));
    $(".menu-plane").prependTo($(".header-menu"));
    $(".m-dropdown").remove(); // 移除移动端的下拉箭头
    $(".phone-tabs").css("display", "block");
}

// 打开搜索弹窗
function openSearch() {
    $(".dialog-search-plane").addClass("dialog-search-plane-show");
}

// 关闭搜索弹窗
function closeSearch() {
    $(".dialog-search-plane").removeClass("dialog-search-plane-show");
}

// 移动端菜单项点击事件 (处理子菜单展开)
function mobile_menuclick(t, e) {
    // 隐藏所有子菜单
    $(".user-menu .sub-menu").css("visibility", "hidden");
    $(".user-menu .sub-menu").css("opacity", "0");
    
    // 如果当前点击的子菜单是隐藏的，则显示它
    if ($(e).parent().find(".sub-menu").css("visibility") == "hidden") {
        $(e).parent().find(".sub-menu").css("opacity", "1");
        $(e).parent().find(".sub-menu").css("visibility", "visible");
    } else if ($(e).parent().parent().find(".user-sub-menu").css("visibility") == "hidden") {
        $(e).parent().parent().find(".sub-menu").css("opacity", "1");
        $(e).parent().parent().find(".sub-menu").css("visibility", "visible");
    }

    // 切换下拉箭头的旋转动画
    $(".user-menu-main .fa-angle-down").toggleClass("m-dropdown-show-i");
    t.stopPropagation(); // 阻止事件冒泡
}

// 在文档加载完成后，为移动端菜单添加下拉箭头和点击事件
$(document).ready(function() {
    mobileDeal();
});

function mobileDeal() {
    // 为有子菜单的项添加下拉箭头
    $(".menu-mobile .menu-item-has-children").append('<div class="mobile-m-dropdown"><i class="fal fa-angle-down"></i></div>');
    $(".menu-mobile .menu-item-has-children>a").css("display", " inline-block");

    // 子菜单点击事件处理
    $(".menu-mobile .menu-item-has-children").click(function() {
        let t = $(this).children(".mobile-m-dropdown");
        t.children().toggleClass("m-dropdown-show-i");
        $(this).children(".sub-menu").slideToggle();
        return false;
    });

    // 菜单链接点击跳转
    $(".menu-mobile a").click(function() {
        window.location.href = $(this).attr("href");
        return false;
    });

    // 抽屉菜单背景点击时，隐藏所有子菜单
    $(".drawer-menu-list").click(function(t) {
        $(".user-menu .sub-menu").css("visibility", "hidden");
        $(".user-menu .sub-menu").css("opacity", "0");
        $(".user-menu .sub-menu").removeClass("sub-menu-hide");
        $(".user-menu .sub-menu").removeClass("sub-menu-show");
        t.stopPropagation();
    });
}





// 原main.js
const App = {
    config: {
        workerUrl: 'https://blog.xy193.workers.dev'
    },
    state: {
        navItems: [],
        friendlyLinks: [],
        siteStats: null,
        siteSettings: null,
        theme: localStorage.getItem('theme') || 'light',
    },
    helpers: {
        renderIcon: (iconString) => {
            if (!iconString) return '';
            if (iconString.trim().startsWith('<svg')) return iconString;
            return `<i class="${iconString} nav-item-icon"></i>`;
        },
        createUrl: (path) => {
            const isIndexPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
            if (path.startsWith('#') && !isIndexPage) {
                return `index.html${path}`;
            }
            return path;
        }
    },
    
    init() {
        console.error("App.init() must be overridden by the specific page script.");
    },

    applyTheme() { 
        if (this.state.theme === 'dark') document.documentElement.classList.add('dark'); 
        else document.documentElement.classList.remove('dark'); 
    },
    toggleTheme() { 
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light'; 
        localStorage.setItem('theme', this.state.theme); 
        this.applyTheme(); 
        this.renderMobileSidebar();
        const btn = document.getElementById('theme-toggle-button'); 
        if(btn) btn.innerHTML = this.state.theme === 'light' ? `<i class="fal fa-moon"></i>` : `<i class="fal fa-sun"></i>`; 
        if (typeof this.applyCompatibilityFixes === 'function') {
            this.applyCompatibilityFixes();
        }
    },
    applyCompatibilityFixes: function() {},

    renderMobileSidebar() { 
        const container = document.getElementById('sidebar-container');
        if (container) container.innerHTML = this.templates.mobileSidebar();
    },
    openSidebar() {
        document.getElementById('sidebar-overlay')?.classList.remove('hidden');
        document.getElementById('sidebar-menu')?.classList.remove('-translate-x-full');
    },
    closeSidebar() {
        document.getElementById('sidebar-overlay')?.classList.add('hidden');
        document.getElementById('sidebar-menu')?.classList.add('-translate-x-full');
    },
    toggleSubMenu(event) {
        const parentLi = event.target.closest('li');
        const subMenu = parentLi?.querySelector('ul');
        const arrow = parentLi?.querySelector('i.fa-chevron-right');
        if (subMenu) {
            subMenu.classList.toggle('hidden');
            arrow?.classList.toggle('rotate-90');
        }
    },
    renderSearchModal() {
        const container = document.getElementById('search-modal-container');
        if (container) container.innerHTML = this.templates.searchModal();
    },
    openSearchModal() {
        const modal = document.getElementById('search-modal');
        if (modal) modal.classList.remove('hidden');
    },
    closeSearchModal() {
        document.getElementById('search-modal')?.classList.add('hidden');
    },
    handleScroll() { 
        const btn = document.getElementById('back-to-top'); 
        if (btn) {
             if (window.scrollY > 300) btn.style.display = 'flex'; 
             else btn.style.display = 'none';
        }
    },
    handleSearchSubmit(event) {
        event.preventDefault();
        const query = event.target.querySelector('[name="query"]').value.trim();
        if (query) {
            window.location.href = `index.html#/search/${encodeURIComponent(query)}`;
        }
        this.closeSearchModal();
    },

    async fetchNavIfNeeded() { if (this.state.navItems.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/nav`); this.state.navItems = await res.json(); } catch (e) { this.state.navItems = [{ label: '首页', url: 'index.html' }]; } },
    async fetchFriendlyLinksIfNeeded() { if (this.state.friendlyLinks.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/links`); this.state.friendlyLinks = await res.json(); } catch (e) {} },
    async fetchSiteStatsIfNeeded(forceRefresh = false) { if (!this.state.siteStats || forceRefresh) try { const res = await fetch(`${this.config.workerUrl}/api/stats`); this.state.siteStats = await res.json(); } catch (e) {} },
    async fetchSiteSettingsIfNeeded(forceRefresh = false) { if (!this.state.siteSettings || forceRefresh) try { const res = await fetch(`${this.config.workerUrl}/api/settings`); this.state.siteSettings = await res.json(); } catch (e) {} },

    templates: {
        header: () => {
            const renderMenuItems = (items) => {
                return `<ul class="submenu">${items.map(item => {
                    const hasChildren = item.children && item.children.length > 0;
                    const finalUrl = App.helpers.createUrl(item.url);
                    return `<li class="nav-item">
                        <a href="${finalUrl}">
                            <span>${App.helpers.renderIcon(item.icon)} ${item.label}</span>
                            ${hasChildren ? '<i class="fas fa-chevron-right submenu-arrow"></i>' : ''}
                        </a>
                        ${hasChildren ? renderMenuItems(item.children) : ''}
                    </li>`;
                }).join('')}</ul>`;
            };

            const topLevelNavHtml = App.state.navItems.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                const finalUrl = App.helpers.createUrl(item.url);
                return `<li class="nav-item">
                    <a href="${finalUrl}">
                        ${App.helpers.renderIcon(item.icon)}
                        <span>${item.label}</span>
                        ${hasChildren ? '<i class="fas fa-chevron-down dropdown-arrow"></i>' : ''}
                    </a>
                    ${hasChildren ? renderMenuItems(item.children) : ''}
                </li>`;
            }).join('');
            
            const settings = App.state.siteSettings;
            const blogName = settings?.blogName || 'My Blog';
            const themeIcon = App.state.theme === 'light' ? `<i class="fal fa-moon"></i>` : `<i class="fal fa-sun"></i>`;

            return `<header class="header">
                <div class="container header-inner">
                    <div class="header-group-left">
                        <a href="index.html" class="header-logo">${blogName}</a>
                        <nav class="header-nav">
                            <ul>${topLevelNavHtml}</ul>
                        </nav>
                    </div>
                    <div class="header-group-right">
                        <button class="icon-button" onclick="App.openSearchModal()"><i class="fal fa-search"></i></button>
                        <button id="theme-toggle-button" class="icon-button" onclick="App.toggleTheme()">${themeIcon}</button>
                        <a href="admin.html" class="button button-outline">登录</a>
                    </div>
                </div>
            </header>`;
        },
        // All other templates (mobileSidebar, searchModal, footer, etc.) remain the same
        // as the previous version.
        mobileSidebar: () => { /* ... same as before ... */ },
        searchModal: () => { /* ... same as before ... */ },
        footer: () => {
            const stats = App.state.siteStats || {};
            const contactsHtml = (stats.custom_contacts || []).map(contact =>
                `<a href="#" title="${contact.content}"><i class="${contact.icon}"></i><span>${contact.content}</span></a>`
            ).join('');

            return `<footer class="footer"><div class="container footer-inner">
                <div class="footer-contacts">${contactsHtml}</div>
                <div class="footer-stats">
                    <span>文章: ${stats.posts_total||0}</span>
                    <span>分类: ${stats.categories_total||0}</span>
                    <span>评论: ${stats.comments_total||0}</span>
                </div>
                <div class="footer-copyright">
                    <span>Copyright © ${stats.copyright_year || new Date().getFullYear()} ${stats.copyright_name || 'My Blog'}.</span>
                </div>
            </div></footer>`;
        },
        friendlyLinksSection: () => { /* ... same as before ... */ },
    }
};
