const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const logoutButton = document.getElementById('logoutButton');

function openSidebar() {
    sidebar.classList.add('sidebar-open');
    overlay.classList.remove('hidden');
}

function closeSidebarFunc() {
    sidebar.classList.remove('sidebar-open');
    overlay.classList.add('hidden');
}

menuToggle.addEventListener('click', openSidebar);
closeSidebar.addEventListener('click', closeSidebarFunc);
overlay.addEventListener('click', closeSidebarFunc);