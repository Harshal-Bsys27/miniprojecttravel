document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("themeToggle");
    const savedTheme = localStorage.getItem("theme") || "light";
    
    // Apply saved theme on load
    document.body.classList.add(savedTheme + "-theme");
    
    themeToggle.addEventListener("click", () => {
        const isDark = document.body.classList.contains("dark-theme");
        document.body.classList.remove(isDark ? "dark-theme" : "light-theme");
        document.body.classList.add(isDark ? "light-theme" : "dark-theme");
        localStorage.setItem("theme", isDark ? "light" : "dark");
    });
});

