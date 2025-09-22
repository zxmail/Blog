const App = {
    config: {
        workerUrl: 'https://blog.xy193.workers.dev'
    },
    state: {
        posts: [],
        navItems: [],
        tags: [],
        categories: {},
        recentPosts: [],
        friendlyLinks: [],
        recentComments: [],
        siteStats: null,
        siteSettings: null,
        comments: {}, 
        theme: localStorage.getItem('theme') || 'light',
        carouselData: null,
        desktopSidebar: null,
        activeTool: '2fa',
        totp: null,
        totpInterval: null,
    },
    helpers: {
        stripHtmlAndTruncate: (html, length) => { const doc = new DOMParser().parseFromString(html, 'text/html'); const text = doc.body.textContent || ""; return text.length > length ? text.substring(0, length) + '...' : text; },
        renderIcon: (iconString) => {
            if (!iconString) return '<i class="fa-fw"></i>';
            if (iconString.trim().startsWith('<svg')) return iconString;
            return `<i class="${iconString} fa-fw"></i>`;
        }
    },
    init() {
        this.applyTheme();
        this.renderMobileSidebar();
        this.renderSearchModal();
        window.addEventListener('hashchange', () => this.router());
        window.addEventListener('load', () => this.router());
        window.addEventListener('scroll', () => this.handleScroll());
    },
    applyTheme() { if (this.state.theme === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); },
    toggleTheme() { this.state.theme = this.state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('theme', this.state.theme); this.applyTheme(); this.renderMobileSidebar(); const btn = document.getElementById('theme-toggle-button'); if(btn) btn.innerHTML = this.state.theme === 'light' ? `<i class="fal fa-moon h-5 w-5"></i>` : `<i class="fal fa-sun h-5 w-5"></i>`; },
    
    // --- UI Control Methods ---
    renderMobileSidebar() { document.getElementById('sidebar-container').innerHTML = this.templates.mobileSidebar(); },
    openSidebar() { document.getElementById('sidebar-overlay')?.classList.remove('hidden'); document.getElementById('sidebar-menu')?.classList.remove('-translate-x-full'); },
    closeSidebar() { document.getElementById('sidebar-overlay')?.classList.add('hidden'); document.getElementById('sidebar-menu')?.classList.add('-translate-x-full'); },
    toggleSubMenu(event) {
        const parentLi = event.target.closest('li');
        const subMenu = parentLi?.querySelector('ul');
        const arrow = parentLi?.querySelector('i.fa-chevron-right');
        if (subMenu) { subMenu.classList.toggle('hidden'); arrow?.classList.toggle('rotate-90'); }
    },
    renderSearchModal() { document.getElementById('search-modal-container').innerHTML = this.templates.searchModal(); },
    openSearchModal() {
        const modal = document.getElementById('search-modal');
        if (modal) { modal.classList.remove('hidden'); modal.querySelector('input[name="query"]')?.focus(); }
    },
    closeSearchModal() { document.getElementById('search-modal')?.classList.add('hidden'); },
    
    // --- Router (For Blog - index.html) ---
    async router() {
        const appContainer = document.getElementById('app');
        const path = window.location.hash.slice(2) || '/'; // Remove #/
        const parts = path.split('/');
        await Promise.all([ this.fetchNavIfNeeded(), this.fetchTagsIfNeeded(), this.fetchFriendlyLinksIfNeeded(), this.fetchRecentCommentsIfNeeded(), this.fetchSiteStatsIfNeeded(), this.fetchCarouselDataIfNeeded(), this.fetchSiteSettingsIfNeeded() ]);
        await this.fetchDataIfNeeded();

        if(this.state.totpInterval) clearInterval(this.state.totpInterval);
        
        if (path === '/') {
            appContainer.innerHTML = this.templates.mainLayout(this.templates.homePage(this.state.posts));
            this.initSwiper();
            this.initStickySidebar();
        } else if (parts[0] === 'post' && parts[1]) {
            const slug = parts[1];
            const post = await this.fetchSinglePost(slug);
            await this.fetchCommentsForPost(slug);
            if (post) { const postIndex = this.state.posts.findIndex(p => p.slug === slug); if (postIndex > -1) this.state.posts[postIndex] = post; else this.state.posts.unshift(post); }
            appContainer.innerHTML = this.templates.mainLayout(this.templates.postPage(post));
            this.initStickySidebar();
        } else if (['search', 'category', 'tag'].includes(parts[0])) {
            let results = [];
            let title = "文章列表";
            if(parts[0] === 'search' && parts[1]) { const query = decodeURIComponent(parts[1]); results = await this.fetchSearchResults(query); title = `搜索结果: "${query}"`;
            } else if (parts[0] === 'category') { const categoryName = parts.slice(1).map(decodeURIComponent).join('/'); results = this.state.posts.filter(p => p.category && p.category.startsWith(categoryName)); title = `分类: ${categoryName}`;
            } else if (parts[0] === 'tag' && parts[1]) { const tagName = decodeURIComponent(parts[1]); results = this.state.posts.filter(p => p.tags && p.tags.includes(tagName)); title = `标签: ${tagName}`; }
            appContainer.innerHTML = this.templates.mainLayout(this.templates.homePage(results, title));
            this.initSwiper();
            this.initStickySidebar();
        } else {
            appContainer.innerHTML = this.templates.mainLayout(this.templates.notFoundPage());
        }
        document.title = this.state.siteSettings?.blogName || '我的博客';
        this.renderMobileSidebar();
    },

    // --- Event Handlers & Tool Logic ---
    handleSearchSubmit(event) {
        event.preventDefault();
        const query = event.target.querySelector('[name="query"]').value.trim();
        if (query) { window.location.hash = `#/search/${encodeURIComponent(query)}`; }
        this.closeSearchModal();
    },
    setActiveTool(toolName) {
        if(this.state.totpInterval) clearInterval(this.state.totpInterval);
        this.state.activeTool = toolName;
        this.renderToolContent();
        document.querySelectorAll('.tool-sidebar a').forEach(a => a.classList.remove('active'));
        document.querySelector(`.tool-sidebar a[onclick="App.setActiveTool('${toolName}')"]`).classList.add('active');
    },
    renderToolContent() {
        const contentContainer = document.getElementById('tool-content-wrapper');
        if (!contentContainer) return;
        if (this.state.activeTool === '2fa') {
            contentContainer.innerHTML = this.templates.tool2FA();
            this.update2FACode();
        } else if (this.state.activeTool === 'qrcode') {
            contentContainer.innerHTML = this.templates.toolQRCode();
        }
    },
    update2FACode() {
        const keyInput = document.getElementById('2fa-key-input');
        const secretKey = keyInput?.value.trim().replace(/\s/g, '');
        const codeDisplay = document.getElementById('2fa-code');
        const timeDisplay = document.getElementById('2fa-time');
        const progressDisplay = document.getElementById('2fa-progress');

        if (!keyInput || !codeDisplay || !timeDisplay || !progressDisplay) return; 
        if (this.state.totpInterval) clearInterval(this.state.totpInterval);
        
        if (!secretKey) {
            codeDisplay.textContent = '------';
            timeDisplay.textContent = '等待输入密钥...';
            progressDisplay.style.width = '100%';
            return;
        }

        try {
            this.state.totp = new otpauth.TOTP({ secret: secretKey });
            const update = () => {
                const token = this.state.totp.generate();
                const remainingTime = 30 - (Math.floor(Date.now() / 1000) % 30);
                const progress = (remainingTime / 30) * 100;
                codeDisplay.textContent = token.slice(0, 3) + ' ' + token.slice(3);
                timeDisplay.textContent = `剩余时间: ${remainingTime} 秒`;
                progressDisplay.style.width = `${progress}%`;
                codeDisplay.classList.toggle('text-red-500', remainingTime < 5);
            };
            update();
            this.state.totpInterval = setInterval(update, 1000);
        } catch (error) {
            codeDisplay.textContent = '密钥无效';
            timeDisplay.textContent = '请输入有效的Base32密钥';
            progressDisplay.style.width = '0%';
        }
    },
    generateQRCode() {
        const textInput = document.getElementById('qr-text-input');
        const canvasContainer = document.getElementById('qr-canvas-container');
        if (!textInput || !canvasContainer) return;
        const text = textInput.value.trim();
        canvasContainer.innerHTML = ''; 
        if (text === '') { canvasContainer.innerHTML = '<p class="text-gray-400">请输入内容以生成二维码</p>'; return; }
        const canvasEl = document.createElement('canvas');
        canvasContainer.appendChild(canvasEl);
        QRCode.toCanvas(canvasEl, text, { width: 256, margin: 2 }, (error) => {
            if (error) { canvasContainer.innerHTML = '<p class="text-red-500">二维码生成失败，请重试。</p>'; console.error(error); }
        });
    },
    async handleCommentSubmit(event, slug) { event.preventDefault(); const { nickname, content } = event.target; if (!nickname.value.trim() || !content.value.trim()) { alert('昵称和内容不能为空!'); return; } try { const res = await fetch(`${this.config.workerUrl}/api/comments/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: nickname.value, content: content.value }) }); if (res.ok) { event.target.reset(); this.state.recentComments = []; this.state.siteStats = null; await this.fetchCommentsForPost(slug); this.router(); } else throw new Error('评论失败'); } catch (e) { alert('评论提交失败'); } },

    // --- Data Fetching Methods ---
    async fetchNavIfNeeded() { if (this.state.navItems.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/nav`); this.state.navItems = await res.json(); } catch (e) { this.state.navItems = [{ label: '首页', url: '#/' }]; } },
    async fetchDataIfNeeded(forceRefresh = false) { if (this.state.posts.length === 0 || forceRefresh) try { const res = await fetch(`${this.config.workerUrl}/api/posts`); const posts = await res.json(); this.state.posts = posts; const categories = {}; posts.forEach(p => { const catParts = p.category.split('/'); catParts.forEach((part, i) => { const catPath = catParts.slice(0, i + 1).join('/'); categories[catPath] = (categories[catPath] || 0) + 1; }); }); this.state.categories = categories; this.state.recentPosts = posts.slice(0, 5); } catch (e) {} },
    async fetchTagsIfNeeded() { if (this.state.tags.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/tags`); this.state.tags = await res.json(); } catch (e) {} },
    async fetchFriendlyLinksIfNeeded() { if (this.state.friendlyLinks.length === 0) try { const res = await fetch(`${this.config.workerUrl}/api/links`); this.state.friendlyLinks = await res.json(); } catch (e) {} },
    async fetchRecentCommentsIfNeeded(forceRefresh = false) { if (this.state.recentComments.length === 0 || forceRefresh) try { const res = await fetch(`${this.config.workerUrl}/api/comments/recent`); this.state.recentComments = await res.json(); } catch (e) {} },
    async fetchCommentsForPost(slug) { try { const res = await fetch(`${this.config.workerUrl}/api/comments/${slug}`); this.state.comments[slug] = await res.json(); } catch (e) { this.state.comments[slug] = []; } },
    async fetchSinglePost(slug) { try { const response = await fetch(`${this.config.workerUrl}/api/posts/${slug}`); if (!response.ok) throw new Error('Post not found'); return await response.json(); } catch (error) { return null; } },
    async fetchSiteStatsIfNeeded() { if (!this.state.siteStats) try { const res = await fetch(`${this.config.workerUrl}/api/stats`); this.state.siteStats = await res.json(); } catch (e) {} },
    async fetchSiteSettingsIfNeeded() { if (!this.state.siteSettings) try { const res = await fetch(`${this.config.workerUrl}/api/settings`); this.state.siteSettings = await res.json(); } catch (e) {} },
    async fetchSearchResults(query) { try { const res = await fetch(`${this.config.workerUrl}/api/search?q=${encodeURIComponent(query)}`); return await res.json(); } catch (e) { return []; } },
    async fetchCarouselDataIfNeeded() { if (!this.state.carouselData) try { const res = await fetch(`${this.config.workerUrl}/api/carousel`); this.state.carouselData = await res.json(); } catch (e) {} },
    handleScroll() { const btn = document.getElementById('back-to-top'); if (window.scrollY > 300) btn.style.display = 'flex'; else btn.style.display = 'none'; },
    initSwiper() { if (document.querySelector('.swiper')) { new Swiper('.swiper', { loop: true, autoplay: { delay: 5000, disableOnInteraction: false }, pagination: { el: '.swiper-pagination', clickable: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }, }); } },
    initStickySidebar() { const el = document.querySelector('#desktop-sidebar-wrapper'); if (el) { this.state.desktopSidebar = new StickySidebar(el, { topSpacing: 80, bottomSpacing: 20, containerSelector: '.main-container', innerWrapperSelector: '.sidebar-inner-wrapper' }); } },

    templates: {
        header: () => {
            const renderMenuItems = (items) => {
                return `<ul class="list-none">${items.map(item => {
                    const hasChildren = item.children && item.children.length > 0;
                    return `<li class="relative group"><a href="${item.url}" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex justify-between items-center"><span>${App.helpers.renderIcon(item.icon)} ${item.label}</span>${hasChildren ? '<i class="fas fa-chevron-right text-xs"></i>' : ''}</a>${hasChildren ? `<div class="absolute hidden sub-menu bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-30 w-full border dark:border-gray-700">${renderMenuItems(item.children)}</div>` : ''}</li>`;
                }).join('')}</ul>`;
            };
            const renderTopLevelMenu = (items) => `<nav class="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">${items.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                const url = item.url.startsWith('#') ? 'index.html' + item.url : item.url;
                return `<div class="relative group"><a href="${url}" class="px-3 py-2 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">${App.helpers.renderIcon(item.icon)}<span>${item.label}</span>${hasChildren ? '<i class="fas fa-chevron-down text-xs opacity-70"></i>' : ''}</a>${hasChildren ? `<div class="absolute hidden dropdown-menu bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 z-20 w-full border dark:border-gray-700">${renderMenuItems(item.children)}</div>` : ''}</div>`;
            }).join('')}</nav>`;
            
            const settings = App.state.siteSettings;
            const logoOrIcon = settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.blogName || ''} Logo" class="h-[50px] w-auto">` : '';
            const mobileLogoOrIcon = settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="${settings.blogName || ''} Logo" class="h-[40px] w-auto">` : '';
            const blogName = settings?.blogName || '';
            const themeIcon = App.state.theme === 'light' ? `<i class="fal fa-moon h-5 w-5"></i>` : `<i class="fal fa-sun h-5 w-5"></i>`;

            return `<header class="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6">
                    <div class="flex justify-between items-center h-[50px] md:h-[62px]">
                        <div class="hidden md:flex flex-1 items-center gap-4">
                            <a href="index.html" class="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">${logoOrIcon}<span class="text-[1.7rem]">${blogName}</span></a>
                            ${renderTopLevelMenu(App.state.navItems)}
                        </div>
                        <div class="hidden md:flex items-center gap-[6px] text-gray-600 dark:text-gray-300">
                            <button onclick="App.openSearchModal()" class="p-[0.16rem] rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fal fa-search h-5 w-5"></i></button>
                            <button id="theme-toggle-button" onclick="App.toggleTheme()" class="p-[0.16rem] rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">${themeIcon}</button>
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
                <nav id="sidebar-menu" class="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-lg z-50 transform -translate-x-full transition-transform duration-300 ease-in-out flex flex-col">
                    <div class="flex justify-between items-center p-4 border-b dark:border-gray-700">
                        <h2 class="font-bold text-lg">菜单</h2>
                        <button onclick="App.closeSidebar()" class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="flex-grow p-2 space-y-1 overflow-y-auto">
                        ${navItemsHtml}
                    </div>
                    <div class="p-2 border-t dark:border-gray-700 space-y-1">
                        <button onclick="App.toggleTheme()" class="w-full flex items-center gap-3 p-3 rounded-md text-left hover:bg-gray-100 dark:hover:bg-gray-700">${themeIcon}</button>
                        <a href="admin.html" class="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><i class="fal fa-user-circle fa-fw"></i> <span>登录</span></a>
                    </div>
                </nav>
            `;
        },
        mobileSidebarMenuItems: (items) => {
            return `<ul class="space-y-1">${items.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                const url = item.url.startsWith('#') ? 'index.html' + item.url : item.url;
                return `
                    <li>
                        <div class="flex justify-between items-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <a href="${hasChildren ? 'javascript:void(0)' : url}" class="flex-grow flex items-center gap-3 p-3" ${hasChildren ? 'onclick="App.toggleSubMenu(event)"' : 'onclick="App.closeSidebar()"'}>
                                ${App.helpers.renderIcon(item.icon)}
                                <span>${item.label}</span>
                            </a>
                            ${hasChildren ? '<i class="fas fa-chevron-right text-xs p-3 cursor-pointer transition-transform duration-200" onclick="App.toggleSubMenu(event)"></i>' : ''}
                        </div>
                        ${hasChildren ? `<ul class="pl-5 mt-1 space-y-1 hidden">${App.templates.mobileSidebarMenuItems(item.children)}</ul>` : ''}
                    </li>
                `;
            }).join('')}</ul>`;
        },
        searchModal: () => `
            <div id="search-modal" class="fixed inset-0 bg-black bg-opacity-75 z-50 hidden flex items-center justify-center p-4" onclick="App.closeSearchModal()">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 relative" onclick="event.stopPropagation()">
                    <button onclick="App.closeSearchModal()" class="absolute top-3 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                    <h3 class="text-lg font-semibold mb-4">搜索文章</h3>
                    <form onsubmit="App.handleSearchSubmit(event)">
                        <div class="relative">
                            <input type="search" name="query" placeholder="请输入关键词..." class="w-full pl-5 pr-12 py-3 border-2 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:outline-none focus:border-gray-500" autofocus>
                            <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md">
                                <i class="fal fa-search"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `,
        mainLayout: (content) => `<div class="flex-grow">${App.templates.header()}<main class="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8"><div class="lg:flex gap-6 main-container">${content}</div></main>${App.templates.friendlyLinksSection()}</div>${App.templates.footer()}`,
        footer: () => {
            const stats = App.state.siteStats || {};
            return `<footer class="mt-auto text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6">
                    <div class="py-8 text-center">
                        <p>${stats.copyright_name || 'My Blog'} © ${stats.copyright_year || new Date().getFullYear()}</p>
                        <p class="text-xs text-gray-400 mt-1">Powered by Cloudflare Workers & Pages</p>
                    </div>
                </div>
            </footer>`;
        },
        friendlyLinksSection: () => {
             if (!App.state.friendlyLinks || App.state.friendlyLinks.length === 0) return '';
             return `<div class="max-w-7xl mx-auto w-full px-4 sm:px-6"><div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 my-8"><h3 class="font-semibold text-lg mb-4">友情链接</h3><div class="text-sm text-gray-600 dark:text-gray-400">${(App.state.friendlyLinks||[]).map(link=>`<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-500 mr-4">${link.name}</a>`).join('')}</div></div></div>`;
        },

        // --- Blog Specific Templates ---
        homePage: (posts, title = "最新文章") => `${App.templates.carousel()}<div class="mt-8 flex-grow"><h1 class="text-lg md:text-xl font-bold mb-2">${title}</h1><div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"><div class="divide-y divide-gray-200 dark:divide-gray-700">${posts.length > 0 ? posts.map(post => App.templates.postCard(post)).join('') : '<p class="p-6">没有找到相关文章。</p>'}</div></div></div>`,
        postCard: (post) => `<div class="p-6 flex flex-row items-center">
            <div class="relative w-1/3 flex-shrink-0 overflow-hidden rounded-md aspect-[16/9]">
                <a href="#/post/${post.slug}" class="block h-full w-full group">
                    <img src="${post.imageUrl || 'https://placehold.co/400x300/e2e8f0/cbd5e0?text=Image'}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110" onerror="this.onerror=null;this.src='https://placehold.co/400x300/e2e8f0/cbd5e0?text=Image';">
                </a>
                <a href="#/category/${encodeURIComponent(post.category)}" class="hidden md:block absolute top-3 left-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-opacity-70">${post.category}</a>
            </div>
            <div class="pl-5 flex-grow flex flex-col justify-between self-stretch">
                <div>
                    <h2 class="text-base md:text-lg font-bold mb-2"><a href="#/post/${post.slug}" class="hover:text-blue-600 dark:hover:text-blue-400">${post.isPinned ? '<span class="text-red-500 font-bold">[置顶]</span> ' : ''}${post.title}</a></h2>
                    <div class="hidden md:block text-gray-600 dark:text-gray-400 leading-relaxed text-sm mb-4">${App.helpers.stripHtmlAndTruncate(post.content, 100)}</div>
                </div>
                <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-auto">
                    <span>${new Date(post.date).toLocaleDateString()}</span>
                    <div class="flex items-center gap-1"><i class="fas fa-eye"></i><span>${post.views || 0}</span></div>
                </div>
            </div>
        </div>`,
        postPage: (post) => { /* ... full definition ... */ },
        desktopSidebar: () => `<aside id="desktop-sidebar-wrapper" class="w-full lg:w-1/4 flex-shrink-0"><div class="sidebar-inner-wrapper space-y-6">${(App.state.siteSettings?.sidebarModules || []).filter(m => m.enabled).map(m => App.templates.sidebarModules[m.id] ? App.templates.sidebarModules[m.id]() : '').join('')}</div></aside>`,
        sidebarModules: {
            search: () => `<div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">...</div>`,
            // ... all other sidebar module definitions ...
        },
        commentForm: (slug) => { /* ... full definition ... */ },
        commentsSection: (slug) => { /* ... full definition ... */ },
        notFoundPage: () => { /* ... full definition ... */ },
        carousel: () => { const data = App.state.carouselData; if (!data || !data.slides || data.slides.length === 0) return ''; const slidesHtml = data.slides.map(slide => { const slideContent = `<img src="${slide.imageUrl}" class="w-full h-full object-cover">`; const linkWrapper = slide.linkUrl && slide.linkUrl !== '#' ? `<a href="${slide.linkUrl}" target="_blank" class="block w-full h-full">${slideContent}</a>` : slideContent; return `<div class="swiper-slide">${linkWrapper}</div>`; }).join(''); return `<div class="swiper w-full rounded-lg shadow-lg aspect-[4/1] md:aspect-auto md:h-[230px]"><div class="swiper-wrapper">${slidesHtml}</div><div class="swiper-pagination"></div><div class="swiper-button-prev"></div><div class="swiper-button-next"></div></div>`; },
        
        // --- Tools Page Specific Templates ---
        toolsPage: () => `
            <div class="flex flex-col md:flex-row gap-6">
                ${App.templates.toolSidebar()}
                <div id="tool-content-wrapper" class="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-8">
                    </div>
            </div>
        `,
        toolSidebar: () => `
            <aside class="w-full md:w-28 flex-shrink-0">
                <nav class="tool-sidebar flex flex-row md:flex-col md:space-y-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
                    <a href="javascript:void(0)" onclick="App.setActiveTool('2fa')" class="flex flex-col items-center justify-center text-center p-3 rounded-lg active w-20 md:w-full flex-shrink-0">
                        <div class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 mb-1"><i class="fas fa-user-shield text-xl text-gray-500"></i></div>
                        <span class="text-xs text-gray-600 dark:text-gray-400">2FA验证</span>
                    </a>
                    <a href="javascript:void(0)" onclick="App.setActiveTool('qrcode')" class="flex flex-col items-center justify-center text-center p-3 rounded-lg w-20 md:w-full flex-shrink-0">
                        <div class="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 mb-1"><i class="fas fa-qrcode text-xl text-gray-500"></i></div>
                        <span class="text-xs text-gray-600 dark:text-gray-400">QR码生成</span>
                    </a>
                </nav>
            </aside>
        `,
        tool2FA: () => `
            <div>
                <h1 class="text-2xl font-bold mb-2">2FA验证</h1>
                <p class="text-gray-500 dark:text-gray-400 mb-6">双因素验证(2FA)在线工具（相当于谷歌身份验证器），使用前请将密钥信息复制在下方即可。</p>
                <div class="mb-4">
                    <input id="2fa-key-input" type="text" placeholder="请在此处输入2FA密钥 (Secret Key)" class="w-full px-4 py-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-accent">
                </div>
                <button onclick="App.update2FACode()" class="bg-accent text-white font-bold px-6 py-3 rounded-md hover:opacity-90">点击获取验证码</button>
                <div class="mt-6 p-4 border dark:border-gray-600 rounded-md">
                    <p class="text-sm text-gray-500">当前验证码 (已实时刷新):</p>
                    <p id="2fa-code" class="text-4xl font-mono font-bold my-2 tracking-widest">------</p>
                    <p id="2fa-time" class="text-sm text-gray-500 mb-2">等待输入密钥...</p>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div id="2fa-progress" class="bg-accent h-1.5 rounded-full" style="width: 100%; transition: width 1s linear;"></div>
                    </div>
                </div>
                <hr class="my-8 dark:border-gray-700">
                <div>
                    <h2 class="text-xl font-bold mb-2">2FA工具说明</h2>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <p><strong>提示帮助：</strong> 欢迎使用在线两步验证码生成工具，粘贴或输入您的密钥即可验证。否则默认输入框的密钥，是本站提供的虚拟测试密钥，生存期为永久。</p>
                        <p><strong>数据说明：</strong> 所有验证过程均在您的浏览器本地完成，密钥信息不会上传至网络服务器，保障您的数据安全。刷新页面或关闭浏览器，密钥将会自动清空。</p>
                    </div>
                </div>
            </div>
        `,
        toolQRCode: () => `
            <div>
                <h1 class="text-2xl font-bold mb-2">在线生成二维码(QR码)</h1>
                <p class="text-gray-500 dark:text-gray-400 mb-6">在下方的文本框中输入您想要生成二维码的内容，可以是网址、文字、联系方式等。</p>
                <div class="mb-4">
                    <textarea id="qr-text-input" rows="4" placeholder="请输入内容..." class="w-full px-4 py-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-accent" onkeyup="App.generateQRCode()"></textarea>
                </div>
                <div id="qr-canvas-container" class="mt-6 p-4 border dark:border-gray-600 rounded-md flex items-center justify-center bg-white" style="min-height: 288px;">
                    <p class="text-gray-400">请输入内容以生成二维码</p>
                </div>
                 <hr class="my-8 dark:border-gray-700">
                <div>
                    <h2 class="text-xl font-bold mb-2">QR码工具说明</h2>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <p><strong>提示帮助：</strong> QR码（快速响应矩阵码）是一种二维条码，可以被智能手机摄像头快速读取。它常用于存储网址、联系信息、Wi-Fi密码等。</p>
                        <p><strong>数据说明：</strong> 所有二维码均在您的浏览器本地实时生成，输入的内容不会被发送到任何服务器。您可以右键点击生成的二维码图片进行保存。</p>
                    </div>
                </div>
            </div>
        `,
    }
};
