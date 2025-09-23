// main.js
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
            if (!iconString) return '<i class="fa-fw"></i>';
            if (iconString.trim().startsWith('<svg')) return iconString;
            return `<i class="${iconString} fa-fw"></i>`;
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

    // --- Core UI & Theme Methods ---
    applyTheme() {
        const darkStyleLink = document.getElementById('dark-theme-style');
        // Also toggle class on root html element for any minor style dependencies
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(this.state.theme);

        if (this.state.theme === 'dark') {
            if (!darkStyleLink) {
                const link = document.createElement('link');
                link.id = 'dark-theme-style';
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = 'dark.css'; // The new stylesheet
                document.head.appendChild(link);
            }
        } else {
            if (darkStyleLink) {
                darkStyleLink.remove();
            }
        }
    },
    toggleTheme() { 
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light'; 
        localStorage.setItem('theme', this.state.theme); 
        this.applyTheme(); 
        this.renderMobileSidebar(); // Re-render to update icons
        const btn = document.getElementById('theme-toggle-button'); 
        if(btn) btn.innerHTML = this.state.theme === 'light' ? `<i class="fal fa-moon h-5 w-5"></i>` : `<i class="fal fa-sun h-5 w-5"></i>`; 
    },
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
        if (modal) {
            modal.classList.remove('hidden');
            modal.querySelector('input[name="query"]')?.focus();
        }
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

    // --- Core Data Fetching Methods ---
    async fetchNavIfNeeded() { if (this.state.navItems.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/nav`); this.state.navItems = await res.json(); } catch (e) { this.state.navItems = [{ label: '首页', url: 'index.html' }]; } },
    async fetchFriendlyLinksIfNeeded() { if (this.state.friendlyLinks.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/links`); this.state.friendlyLinks = await res.json(); } catch (e) {} },
    async fetchSiteStatsIfNeeded(forceRefresh = false) { if (!this.state.siteStats || forceRefresh) try { const res = await fetch(`${this.config.workerUrl}/api/stats`); this.state.siteStats = await res.json(); } catch (e) {} },
    async fetchSiteSettingsIfNeeded(forceRefresh = false) { if (!this.state.siteSettings || forceRefresh) try { const res = await fetch(`${this.config.workerUrl}/api/settings`); this.state.siteSettings = await res.json(); } catch (e) {} },

    // --- Shared Templates ---
    templates: {
        header: () => {
            const renderMenuItems = (items) => {
                return `<ul class="list-none">${items.map(item => {
                    const hasChildren = item.children && item.children.length > 0;
                    const finalUrl = App.helpers.createUrl(item.url);
                    return `<li class="relative group"><a href="${finalUrl}" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex justify-between items-center"><span>${App.helpers.renderIcon(item.icon)} ${item.label}</span>${hasChildren ? '<i class="fas fa-chevron-right text-xs"></i>' : ''}</a>${hasChildren ? `<div class="absolute hidden sub-menu bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-30 w-full border dark:border-gray-700">${renderMenuItems(item.children)}</div>` : ''}</li>`;
                }).join('')}</ul>`;
            };
            const renderTopLevelMenu = (items) => `<nav class="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">${items.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                const finalUrl = App.helpers.createUrl(item.url);
                return `<div class="relative group"><a href="${finalUrl}" class="px-3 py-2 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">${App.helpers.renderIcon(item.icon)}<span>${item.label}</span>${hasChildren ? '<i class="fas fa-chevron-down text-xs opacity-70"></i>' : ''}</a>${hasChildren ? `<div class="absolute hidden dropdown-menu bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-20 w-full border dark:border-gray-700">${renderMenuItems(item.children)}</div>` : ''}</div>`;
            }).join('')}</nav>`;
            
            const settings = App.state.siteSettings;
            const logoOrIcon = settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.blogName || ''} Logo" class="h-[50px] w-auto">` : '';
            const mobileLogoOrIcon = settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.blogName || ''} Logo" class="h-[40px] w-auto">` : '';
            const blogName = settings?.blogName || '';
            const themeIcon = App.state.theme === 'light' ? `<i class="fal fa-moon h-5 w-5"></i>` : `<i class="fal fa-sun h-5 w-5"></i>`;

            return `<header class="sticky top-0 z-30 bg-white shadow-[0_0.5px_0.5px_1px_rgba(0,0,0,0.1)]">
                <div class="max-w-7xl mx-auto px-4 sm:px-6">
                    <div class="flex justify-between items-center h-[50px] md:h-[62px]">
                        <div class="hidden md:flex flex-1 items-center gap-4">
                            <a href="index.html" class="font-bold text-gray-900 flex items-center gap-2">${logoOrIcon}<span class="text-[1.7rem]">${blogName}</span></a>
                            ${renderTopLevelMenu(App.state.navItems)}
                        </div>
                        <div class="hidden md:flex items-center gap-[6px] text-gray-600">
                            <button onclick="App.openSearchModal()" class="p-[0.16rem] rounded-full hover:bg-gray-100"><i class="fal fa-search h-5 w-5"></i></button>
                            <button id="theme-toggle-button" onclick="App.toggleTheme()" class="p-[0.16rem] rounded-full hover:bg-gray-100">${themeIcon}</button>
                            <a href="admin.html" class="text-sm hover:underline">登录</a>
                        </div>
                        <div class="md:hidden flex flex-1 w-full justify-between items-center">
                            <div class="flex-1 text-left">
                                <button onclick="App.openSidebar()" class="p-2 -ml-2"><i class="fas fa-bars text-base font-medium"></i></button>
                            </div>
                            <div class="flex-shrink-0">
                                <a href="index.html" class="flex items-center gap-2">${mobileLogoOrIcon}<span class="text-lg font-bold">${blogName}</span></a>
                            </div>
                            <div class="flex-1 text-right">
                                 <button onclick="App.openSearchModal()" class="p-2 -mr-2"><i class="fas fa-search text-base font-medium"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>`;
        },
        mobileSidebar: () => {
            const navItemsHtml = App.templates.mobileSidebarMenuItems(App.state.navItems);
            const themeIcon = App.state.theme === 'light' ? `<i class="fal fa-moon fa-fw"></i> <span>切换深色模式</span>` : `<i class="fal fa-sun fa-fw"></i> <span>切换浅色模式</span>`;
            return `
                <div id="sidebar-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden" onclick="App.closeSidebar()"></div>
                <nav id="sidebar-menu" class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform -translate-x-full transition-transform duration-300 ease-in-out flex flex-col">
                    <div class="flex justify-between items-center p-4 border-b">
                        <h2 class="font-bold text-lg">菜单</h2>
                        <button onclick="App.closeSidebar()" class="text-gray-500 hover:text-gray-800"><i class="fas fa-times text-xl"></i></button>
                    </div>
                    <div class="flex-grow p-2 space-y-1 overflow-y-auto">${navItemsHtml}</div>
                    <div class="p-2 border-t space-y-1">
                        <button onclick="App.toggleTheme()" class="w-full flex items-center gap-3 p-3 rounded-md text-left hover:bg-gray-100">${themeIcon}</button>
                        <a href="admin.html" class="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100"><i class="fal fa-user-circle fa-fw"></i> <span>登录</span></a>
                    </div>
                </nav>`;
        },
        mobileSidebarMenuItems: (items) => {
            return `<ul class="space-y-1">${items.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                const finalUrl = App.helpers.createUrl(item.url);
                return `<li>
                    <div class="flex justify-between items-center rounded-md hover:bg-gray-100 text-gray-700">
                        <a href="${hasChildren ? 'javascript:void(0)' : finalUrl}" class="flex-grow flex items-center gap-3 p-3" ${hasChildren ? 'onclick="App.toggleSubMenu(event)"' : 'onclick="App.closeSidebar()"'}>
                            ${App.helpers.renderIcon(item.icon)}<span>${item.label}</span>
                        </a>
                        ${hasChildren ? '<i class="fas fa-chevron-right text-xs p-3 cursor-pointer transition-transform duration-200" onclick="App.toggleSubMenu(event)"></i>' : ''}
                    </div>
                    ${hasChildren ? `<ul class="pl-5 mt-1 space-y-1 hidden">${App.templates.mobileSidebarMenuItems(item.children)}</ul>` : ''}
                </li>`;
            }).join('')}</ul>`;
        },
        searchModal: () => {
            return `
            <div id="search-modal" class="fixed inset-0 bg-black bg-opacity-75 z-50 hidden flex items-center justify-center p-4" onclick="App.closeSearchModal()">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative" onclick="event.stopPropagation()">
                    <button onclick="App.closeSearchModal()" class="absolute top-3 right-4 text-gray-500 hover:text-gray-800"><i class="fas fa-times text-xl"></i></button>
                    <h3 class="text-lg font-semibold mb-4">搜索文章</h3>
                    <form onsubmit="App.handleSearchSubmit(event)">
                        <div class="relative">
                            <input type="search" name="query" placeholder="请输入关键词..." class="w-full pl-5 pr-12 py-3 border-2 rounded-lg focus:outline-none focus:border-gray-500" autofocus>
                            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md"><i class="fal fa-search"></i></button>
                        </div>
                    </form>
                </div>
            </div>`;
        },
        footer: () => {
            const stats = App.state.siteStats || {};
            const contactsHtml = (stats.custom_contacts || []).map(contact =>
                `<a href="#" class="flex items-center gap-x-1.5 hover:text-blue-500" title="${contact.content}"><i class="${contact.icon}"></i><span>${contact.content}</span></a>`
            ).join('');

            return `<footer class="mt-auto text-sm text-gray-500 bg-white border-t border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6">
                    <div class="py-8">
                        <div class="flex flex-col items-center md:items-start space-y-[3px]">
                            <div class="hidden md:flex items-center">
                                <span class="font-semibold text-gray-900">联系方式：</span>
                                <div class="flex items-center ml-2 space-x-[10px]">${contactsHtml}</div>
                            </div>
                            <div class="hidden md:flex items-center">
                                <span class="font-semibold text-gray-900">网站统计：</span>
                                <div class="flex items-center ml-2 space-x-[5px]">
                                    <span class="flex items-center gap-x-1.5"><i class="fas fa-file-alt w-4 text-center"></i><span>文章总数: ${stats.posts_total||0}</span></span>
                                    <span class="flex items-center gap-x-1.5"><i class="fas fa-folder w-4 text-center"></i><span>分类总数: ${stats.categories_total||0}</span></span>
                                    <span class="flex items-center gap-x-1.5"><i class="fas fa-comments w-4 text-center"></i><span>评论总数: ${stats.comments_total||0}</span></span>
                                </div>
                            </div>
                            <div class="text-center md:text-left">
                                <span>Copyright ? ${stats.copyright_year || new Date().getFullYear()} ${stats.copyright_name || 'My Blog'}. Powered by Cloudflare Workers & Pages. Theme designed with Tailwind CSS.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>`;
        },
        friendlyLinksSection: () => {
            if (!App.state.friendlyLinks || App.state.friendlyLinks.length === 0) return '';
            return `<div class="max-w-7xl mx-auto w-full p-4 sm:px-6">
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 my-8">
                            <h3 class="font-semibold text-lg mb-4">友情链接</h3>
                            <div class="text-sm text-gray-600">
                                ${(App.state.friendlyLinks||[]).map(link=>`<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-500 mr-4">${link.name}</a>`).join('')}
                            </div>
                        </div>
                    </div>`;
        },
    }
};
